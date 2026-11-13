import { inject, Injectable, linkedSignal, signal } from '@angular/core';
import { Observable } from 'rxjs';
import { ActionType } from '../models/action-type.model';
import { AppFile } from '../models/app-file.model';
import { BaseFile, FileStatus } from '../models/base-file.model';
import { SharedFile } from '../models/shared-file.model';
import { MessageSeverity } from '../models/toast-info.model';
import { UploadStatus } from '../models/upload-progress-info.model';
import { bulkAction } from '../utils/bulk-action-util';
import { FileApiService } from './api/file-api.service';
import { FileViewService } from './file-view.service';
import { ModalService } from './modal.service';
import { StorageService } from './storage.service';
import { ToastService } from './toast.service';

@Injectable()
export class FileOperationsService {
  private readonly fileView = inject(FileViewService);
  private readonly fileApiService = inject(FileApiService);
  private readonly storage = inject(StorageService);
  private readonly toast = inject(ToastService);
  private readonly modalService = inject(ModalService);
  private readonly actionContext = linkedSignal<
    Map<number, BaseFile>,
    { files: Set<BaseFile>; filesIds: Set<number>; type: ActionType } | null
  >({
    source: () =>
      new Map(
        [...this.fileView.userFiles(), ...this.fileView.sharedFiles()].map(
          (file) => [file.id, file],
        ),
      ),
    computation: (source, previous) => {
      if (!previous?.value) return null;
      return {
        files: new Set(
          [...previous.value.files].map((file) => source.get(file.id) ?? file),
        ),
        filesIds: previous.value.filesIds,
        type: previous.value.type,
      };
    },
  });

  readonly awaitingActionState = this.actionContext.asReadonly();
  readonly editingId = signal<number | null>(null);
  readonly loadingIds = signal<Set<number>>(new Set());
  renameFileWithFeedback(file: BaseFile, newFileName: string) {
    newFileName = newFileName.trim();

    if (newFileName === '') {
      this.toast.show(
        $localize`File rename`,
        $localize`File name cannot be empty`,
        MessageSeverity.error,
      );
      return;
    }

    if (newFileName === file.fileName) {
      this.editingId.set(null);
      return;
    }

    const requestMode = this.fileView.mode();
    if (this.fileView.currentFiles().some((f) => f.fileName === newFileName)) {
      this.toast.show(
        $localize`File rename`,
        $localize`File with this name already exists`,
        MessageSeverity.error,
      );
      return;
    }

    this.setLoading(file.id, true);
    this.editingId.set(null);

    this.fileApiService
      .renameFile(file.id, newFileName)
      .subscribe({
        next: () => {
          this.toast.show(
            $localize`File rename`,
            $localize`File renamed successfully`,
            MessageSeverity.success,
          );
          if (requestMode === 'GetSharedWithMe') {
            this.fileView.updateSharedFile(file.id, { fileName: newFileName });
          } else {
            this.fileView.updateUserFile(file.id, { fileName: newFileName });
          }
        },
        error: (err) => {
          this.toast.show(
            $localize`File rename`,
            err.error || String(err),
            MessageSeverity.error,
          );
        },
      })
      .add(() => this.setLoading(file.id, false));
  }

  changeFilesFavouriteWithFeedback(files: AppFile[], changeTo: boolean) {
    const filesToUpdate = files.filter(
      (file) =>
        file.fileStatus === FileStatus.Completed &&
        file.isFavourite !== changeTo,
    );
    if (filesToUpdate.length === 0) return;
    bulkAction<AppFile>({
      items: filesToUpdate,
      action: (file) => this.fileApiService.setFavourite(file.id, changeTo),
      beforeStart: (file) => this.setLoading(file.id, true),
      onSuccess: (file) => {
        this.fileView.updateUserFile(file.id, { isFavourite: changeTo });
      },
      onError: (file, err) => {
        const errorMessage =
          err &&
          typeof err === 'object' &&
          'error' in err &&
          err.error
            ? String(err.error)
            : String(err);
        this.toast.show(
          $localize`Favourite update failed`,
          errorMessage,
          MessageSeverity.error,
        );
      },
      afterComplete: (file) => this.setLoading(file.id, false),
      toast: (title, msg, severity) => this.toast.show(title, msg, severity),
      successMessage: (count, updated) => {
        if (count === 1) {
          return changeTo
            ? {
                title: $localize`Favourite Update`,
                message: $localize`Added '${updated[0].fileName}' to favourites`,
              }
            : {
                title: $localize`Favourite Update`,
                message: $localize`Removed '${updated[0].fileName}' from favourites`,
              };
        }
        return changeTo
          ? {
              title: $localize`Favourite Update`,
              message: $localize`Added ${count} files to favourites`,
            }
          : {
              title: $localize`Favourite Update`,
              message: $localize`Removed ${count} files from favourites`,
            };
      },
    });
  }

  createDirectoryWithFeedback(
    directoryName: string,
    onSuccess?: (id: number) => void,
  ) {
    const requestMode = this.fileView.mode();
    const requestParentId = this.fileView.parentId();

    this.fileApiService
      .createDirectory(directoryName, requestParentId)
      .subscribe({
        next: (response) => {
          const isCurrentContext =
            this.fileView.mode() === requestMode &&
            this.fileView.parentId() === requestParentId;
          // Optimistic update: add the new directory to the local list immediately
          if (isCurrentContext && requestMode === 'GetSharedWithMe') {
            const optimisticSharedFile: SharedFile = {
              ...(response as SharedFile),
              fileStatus: FileStatus.Completed,
              progressStatus: null,
              partialFileInfo: null,
              uploadProgress: null,
            };
            this.fileView.addSharedFileIfNotExists(optimisticSharedFile);
          } else if (isCurrentContext) {
            const optimisticAppFile: AppFile = {
              ...(response as AppFile),
              fileStatus: FileStatus.Completed,
              progressStatus: null,
              partialFileInfo: null,
              uploadProgress: null,
            };
            this.fileView.addUserFileIfNotExists(optimisticAppFile);
          }

          if (isCurrentContext && onSuccess) {
            onSuccess(response.id);
          }

          // Sync with server to ensure consistency
          if (isCurrentContext) this.fileView.reloadCurrentList();

          this.toast.show(
            $localize`New directory created`,
            $localize`Directory "${response.fileName}" has been created`,
            MessageSeverity.success,
          );
        },
        error: (error) => {
          this.toast.show(
            $localize`Error creating directory`,
            error?.error,
            MessageSeverity.error,
          );
        },
      });
  }

  markFilesToCopyWithFeedback(files: BaseFile[]) {
    this.setFilesMarkedForAction(files, ActionType.Copy);
    this.toast.show(
      $localize`File Copy Initialized`,
      files.length === 1
        ? $localize`Selected '${files[0].fileName}' for copying. Navigate to the target folder and paste the file there.`
        : $localize`Selected ${files.length} files for copying. Navigate to the target folder and paste the files there.`,
      MessageSeverity.info,
    );
  }

  markFilesToMoveWithFeedback(files: BaseFile[]) {
    this.setFilesMarkedForAction(files, ActionType.Move);
    this.toast.show(
      $localize`File Move Initialized`,
      files.length === 1
        ? $localize`Selected '${files[0].fileName}' for moving. Navigate to the target folder and paste the file there.`
        : $localize`Selected ${files.length} files for moving. Navigate to the target folder and paste the files there.`,
      MessageSeverity.info,
    );
  }

  pasteFilesWithFeedback(onSuccess?: (ids: Set<number>) => void) {
    const action = this.awaitingActionState();
    if (!action) return;
    if (action.type === ActionType.Move) {
      this.moveFilesWithFeedback(
        Array.from(action.files),
        this.fileView.parentId(),
        this.fileView.parentName() ?? 'home directory',
        onSuccess,
      );
    } else if (action.type === ActionType.Copy) {
      this.copyFilesWithFeedback(
        Array.from(action.files),
        this.fileView.parentId(),
        this.fileView.parentName() ?? 'home directory',
        onSuccess,
      );
    }
  }

  moveFilesWithFeedback(
    filesToMove: BaseFile[],
    targetDirectoryId: number | null,
    targetDirectoryName: string,
    onSuccess?: (ids: Set<number>) => void,
  ) {
    this.executeFileOperationWithFeedback(
      filesToMove,
      targetDirectoryId,
      targetDirectoryName,
      (ids, targetId) => this.fileApiService.moveFiles(ids, targetId),
      'move',
      onSuccess,
    );
  }

  copyFilesWithFeedback(
    filesToCopy: BaseFile[],
    targetDirectoryId: number | null,
    targetDirectoryName: string,
    onSuccess?: (ids: Set<number>) => void,
  ) {
    this.executeFileOperationWithFeedback(
      filesToCopy,
      targetDirectoryId,
      targetDirectoryName,
      (ids, targetId) => this.fileApiService.copyFiles(ids, targetId),
      'copy',
      onSuccess,
    );
  }

  async deleteFilesWithFeedback(filesToDelete: BaseFile[]): Promise<boolean> {
    if (filesToDelete.length === 0) {
      return false;
    }
    const requestMode = this.fileView.mode();

    const maxLines = 5;
    const totalFiles = filesToDelete.length;
    const fileNamesList = filesToDelete.map((f) => f.fileName);

    const areFilesUploaded = filesToDelete.every(
      (file) => file.fileStatus === FileStatus.Completed,
    );
    let confirmText = '';

    if (totalFiles === 1) {
      confirmText = areFilesUploaded
        ? $localize`Are you sure you want to delete '${fileNamesList[0]}' file?`
        : $localize`Are you sure you want to cancel upload for '${fileNamesList[0]}' file?`;
    } else {
      let displayNames: string[] = [];
      if (totalFiles > maxLines) {
        const shownCount = Math.max(1, maxLines - 1);
        const shown = fileNamesList.slice(0, shownCount);
        const remainingCount = totalFiles - shownCount;
        displayNames = [
          ...shown.map((name) => `• ${name}`),
          $localize`...and ${remainingCount} more`,
        ];
      } else {
        displayNames = fileNamesList.map((name) => `• ${name}`);
      }

      confirmText =
        (areFilesUploaded
          ? $localize`Are you sure you want to delete these files?`
          : $localize`Are you sure you want to cancel upload for these files?`) +
        `\n${displayNames.join('\n')}`;
    }

    const confirmationResult = await this.modalService.confirmChoice({
      title: areFilesUploaded
        ? $localize`Confirm File Deletion`
        : $localize`Confirm Upload Cancellation`,
      message: confirmText,
      confirmText: $localize`Delete`,
      cancelText: $localize`Cancel`,
      showPermanentWarning: true,
    });
    if (!confirmationResult) return false;

    bulkAction<BaseFile>({
      items: filesToDelete,
      action: (file) => this.fileApiService.deleteFile(file.id),
      beforeStart: (file) => this.setLoading(file.id, true),
      onSuccess: (file) => {
        const fileIds = new Set([file.id]);
        if (requestMode === 'GetSharedWithMe') {
          this.fileView.removeSharedFiles(fileIds);
        } else {
          this.fileView.removeUserFiles(fileIds);
        }

        if (requestMode !== 'GetSharedWithMe') {
          this.storage.updateCurrentUserUsedSpace(-file.size);
        }
      },
      onError: (file, err) => {
        this.toast.show(
          $localize`File deletion`,
          err instanceof Error ? err.message : String(err),
          MessageSeverity.error,
        );
      },
      afterComplete: (file) => this.setLoading(file.id, false),
      toast: (title, msg, severity) => this.toast.show(title, msg, severity),
      successMessage: (count) => {
        if (count === 1) {
          return {
            title: areFilesUploaded
              ? $localize`File Deletion`
              : $localize`Upload Cancellation`,

            message: areFilesUploaded
              ? $localize`Deleted '${filesToDelete[0].fileName}' successfully`
              : $localize`Cancelled upload for '${filesToDelete[0].fileName}' successfully`,
          };
        } else {
          return {
            title: areFilesUploaded
              ? $localize`File Deletion`
              : $localize`Upload Cancellation`,

            message: areFilesUploaded
              ? $localize`Deleted ${count} files successfully`
              : $localize`Cancelled upload for ${count} files successfully`,
          };
        }
      },
    });
    return true;
  }

  private executeFileOperationWithFeedback(
    files: BaseFile[],
    targetDirectoryId: number | null,
    targetDirectoryName: string,
    operation: (
      fileIds: number[],
      targetId: number | null,
    ) => Observable<AppFile[] | SharedFile[]>,
    operationName: 'move' | 'copy',
    onSuccess?: (ids: Set<number>) => void,
  ) {
    if (files.length === 0) return;
    if (targetDirectoryName === '') targetDirectoryName = 'Root';

    const requestMode = this.fileView.mode();
    const requestParentId = this.fileView.parentId();

    files.forEach((file) => this.setLoading(file.id, true));

    const fileIds = files.map((f) => f.id);
    const isPlural = files.length > 1;

    operation(fileIds, targetDirectoryId)
      .subscribe({
        next: (result) => {
          if (targetDirectoryId === requestParentId) {
            if (requestMode === 'GetSharedWithMe') {
              (result as SharedFile[]).forEach((file) => {
                const optimisticSharedFile: SharedFile = {
                  ...file,
                  fileStatus: FileStatus.Completed,
                  progressStatus: null,
                  partialFileInfo: null,
                  uploadProgress: null,
                };
                this.fileView.addSharedFileIfNotExists(optimisticSharedFile);
              });
            } else {
              (result as AppFile[]).forEach((file) => {
                const optimisticAppFile: AppFile = {
                  ...file,
                  fileStatus: FileStatus.Completed,
                  progressStatus: null,
                  partialFileInfo: null,
                  uploadProgress: null,
                };
                this.fileView.addUserFileIfNotExists(optimisticAppFile);
              });
            }
          } else if (operationName === 'move') {
            if (requestMode === 'GetSharedWithMe') {
              this.fileView.removeSharedFiles(new Set(fileIds));
            } else {
              this.fileView.removeUserFiles(new Set(fileIds));
            }
          }

          const isCurrentContext =
            this.fileView.mode() === requestMode &&
            this.fileView.parentId() === requestParentId;
          if (
            onSuccess &&
            targetDirectoryId === requestParentId &&
            isCurrentContext
          ) {
            onSuccess(new Set(result.map((file) => file.id)));
          }

          const shouldReloadCurrentList =
            isCurrentContext &&
            (targetDirectoryId === requestParentId ||
              operationName === 'move');
          if (shouldReloadCurrentList) this.fileView.reloadCurrentList();

          const message =
            operationName === 'copy'
              ? isPlural
                ? $localize`Files copied to '${targetDirectoryName}'.`
                : $localize`File copied to '${targetDirectoryName}'.`
              : isPlural
                ? $localize`Files moved to '${targetDirectoryName}'.`
                : $localize`File moved to '${targetDirectoryName}'.`;

          this.toast.show($localize`Success`, message, MessageSeverity.success);
          this.clearActionContext();

          if (operationName === 'copy' && requestMode !== 'GetSharedWithMe') {
            this.storage.updateCurrentUserUsedSpace(
              result.reduce(
                (total: number, file: AppFile | SharedFile) =>
                  total + file.size,
                0,
              ),
            );
          }
        },
        error: (err) => {
          const title =
            operationName === 'copy'
              ? $localize`Copy failed`
              : $localize`Move failed`;
          const message = err?.error
            ? err.error
            : operationName === 'copy'
              ? isPlural
                ? $localize`Could not copy files.`
                : $localize`Could not copy file.`
              : isPlural
                ? $localize`Could not move files.`
                : $localize`Could not move file.`;

          this.toast.show(title, message, MessageSeverity.error);
        },
      })
      .add(() => {
        files.forEach((file) => this.setLoading(file.id, false));
      });
  }

  setLoading(id: number, value: boolean) {
    this.loadingIds.update((prev) => {
      const next = new Set(prev);
      if (value) next.add(id);
      else next.delete(id);
      return next;
    });
  }

  updateUserFile(fileId: number, updates: Partial<AppFile>) {
    this.fileView.updateUserFile(fileId, updates);
  }

  clearActionContext() {
    this.actionContext.set(null);
  }

  private setFilesMarkedForAction(files: BaseFile[], actionType: ActionType) {
    this.actionContext.set({
      files: new Set(files),
      filesIds: new Set(files.map((file) => file.id)),
      type: actionType,
    });
  }
}