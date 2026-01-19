import {
  computed,
  inject,
  Injectable,
  linkedSignal,
  signal,
} from '@angular/core';
import { environment } from '../../../environments/environment.development';
import { AppFile } from '../models/app-file.model';
import { httpResource } from '@angular/common/http';
import { FileResponse } from '../models/file-response.model';
import { debouncedSignal } from '../utils/signal-utils';
import { Router } from '@angular/router';
import { Breadcrumb } from '../models/breadcrumb.model';
import { Observable } from 'rxjs';
import { ActionType } from '../models/action-type.model';
import { ToastService } from './toast.service';
import { MessageSeverity } from '../models/toast-info.model';
import {
  UploadProgressInfo,
  UploadStatus,
} from '../models/upload-progress-info.model';
import { bulkAction } from '../utils/bulk-action-util';
import { ModalService } from './modal.service';
import { FileApiService } from './api/file-api.service';
import { BaseFile, FileStatus, ProgressStatus } from '../models/base-file.model';
import { SharedFile } from '../models/shared-file.model';
import { ShareAccessMode } from '../models/share-access-mode.model';

@Injectable({
  providedIn: 'root',
})
export class FileService {
  private readonly fileUrl = `${environment.apiUrl}/File`;
  private readonly router = inject(Router);
  private readonly fileApiService = inject(FileApiService);
  private readonly toast = inject(ToastService);
  private readonly modalService = inject(ModalService);
  private readonly actionContext = linkedSignal<
    Record<number, BaseFile>,
    { files: Set<BaseFile>; filesIds: Set<number>; type: ActionType } | null
  >({
    source: () =>
      Object.fromEntries(
        this.userFiles().map((item) => [item.id, item])
      ) as Record<string, BaseFile>,
    computation: (source, previous) => {
      if (!previous || !previous.value?.files) return null;
      const resultFiles = [...previous.value.files].map(
        (f) => source[f.id] ?? f
      );

      //Return updated files set
      return {
        files: new Set(resultFiles),
        filesIds: previous.value.filesIds,
        type: previous.value.type,
      };
    },
  });

  readonly awaitingActionState = this.actionContext.asReadonly();

  public readonly mode = signal<
    | 'GetAll'
    | 'GetSharedByMe'
    | 'GetFavourites'
    | 'GetRecent'
    | 'GetSharedWithMe'
  >('GetAll');

  public readonly searchedPhrase = signal<string>('');
  public readonly parentId = signal<number | null>(null);
  public readonly parentName = computed(() =>
    this.breadCrumbsResource.hasValue()
      ? this.breadCrumbsResource.value().find((b) => b.id === this.parentId())
          ?.fileName
      : ''
  );

  public readonly currentPage = signal<number>(1);
  public readonly itemsPerPage = signal<number>(9999);
  public readonly userFiles = linkedSignal<AppFile[]>(
    () =>
      this._linkedFilesResponse()
        ?.items.map((file) => ({
          ...file,
          progressStatus: ProgressStatus.Stopped,
          accessMode: ShareAccessMode.FullAccess,
        }))
        .sort((a, b) => a.fileName.localeCompare(b.fileName)) ?? []
  );

  public readonly sharedFiles = linkedSignal<SharedFile[]>(
    () =>
      this._linkedSharedFilesResponse()
        ?.items.map((file) => ({
          ...file,
          progressStatus: ProgressStatus.Stopped,
          fileStatus: FileStatus.Completed,
        }))
        .sort((a, b) => a.fileName.localeCompare(b.fileName)) ?? []
  );

  public readonly currentFiles = computed<(AppFile | SharedFile)[]>(() => {
    return this.mode() === 'GetSharedWithMe'
      ? this.sharedFiles()
      : this.userFiles();
  });

  // UI state shared across components
  public readonly editingId = signal<number | null>(null);
  public readonly loadingIds = signal<Set<number>>(new Set());
  public readonly pagainationData = computed(() =>
    this._linkedFilesResponse()
      ? {
          currentPage: this.currentPage(),
          itemsPerPage: this.itemsPerPage(),
          totalItems: this._linkedFilesResponse()!.totalCount,
          totalPages: this._linkedFilesResponse()!.totalPages,
        }
      : null
  );

  private readonly _debouncedSearchedPhrase = debouncedSignal(
    this.searchedPhrase,
    300,
    ''
  );
  private readonly _request = computed(
    () => `${
      this.fileUrl
    }/${this.mode()}?PageNumber=${this.currentPage()}&PageSize=${this.itemsPerPage()}
      ${this.parentId() ? '&ParentId=' + this.parentId() : ''}${
      this._debouncedSearchedPhrase() !== ''
        ? '&SearchedPhrase=' + this._debouncedSearchedPhrase()
        : ''
    }`
  );

  private refreshActiveList() {
    if (this.mode() === 'GetSharedWithMe') {
      this._sharedFilesResource.reload();
    } else {
      this._fileResource.reload();
    }
  }

  readonly _fileResource = httpResource<FileResponse<AppFile>>(() =>
    this.mode() !== 'GetSharedWithMe' ? this._request() : undefined
  );
  readonly _sharedFilesResource = httpResource<FileResponse<SharedFile>>(() =>
    this.mode() === 'GetSharedWithMe' ? this._request() : undefined
  );

  private readonly _linkedFilesResponse = linkedSignal<
    FileResponse<AppFile> | undefined,
    FileResponse<AppFile> | undefined
  >({
    source: () => this._fileResource.value(),
    computation: (source, previous) => {
      if (source === undefined && previous?.value !== undefined) {
        return previous?.value;
      }
      return source;
    },
  });

  private readonly _linkedSharedFilesResponse = linkedSignal<
    FileResponse<SharedFile> | undefined,
    FileResponse<SharedFile> | undefined
  >({
    source: () => this._sharedFilesResource.value(),
    computation: (source, previous) => {
      if (source === undefined && previous?.value !== undefined) {
        return previous?.value;
      }
      return source;
    },
  });

  public readonly fileResource = this._fileResource.asReadonly();
  public readonly sharedFilesResource = this._sharedFilesResource.asReadonly();

  //breadcumbs
  private readonly _breadcrumbsQuery = computed(() =>
    this.parentId() !== null
      ? `${this.fileUrl}/GetFilePath/${this.parentId()}`
      : undefined
  );

  private readonly _breadCrumbsResource = httpResource<Breadcrumb[]>(() =>
    this._breadcrumbsQuery()
  );

  public readonly breadCrumbsResource = this._breadCrumbsResource.asReadonly();

  constructor() {
    const currentUrl = this.router.url; // e.g. "/disc/home/folder/123"

    if (currentUrl.startsWith('/disc/home')) {
      // home context
      this.mode.set('GetAll');
      const dirId = this.extractFolderId(currentUrl);
      this.goToFolder(dirId);
    }
  }

  goToFolder(folderId: number | null) {
    this.parentId.set(folderId);

    if (folderId === null)
      this.router.navigate(['/disc', this.mapModeToRoute(this.mode())]);
    else
      this.router.navigate([
        '/disc',
        this.mode() === 'GetSharedWithMe'
          ? this.mapModeToRoute(this.mode())
          : this.mapModeToRoute('GetAll'),
        'folder',
        folderId,
      ]);
  }

  private mapModeToRoute(
    mode:
      | 'GetAll'
      | 'GetSharedByMe'
      | 'GetFavourites'
      | 'GetRecent'
      | 'GetSharedWithMe'
  ) {
    switch (mode) {
      case 'GetAll':
        return 'home';
      case 'GetSharedByMe':
        return 'shared-by-me';
      case 'GetFavourites':
        return 'favourite';
      case 'GetRecent':
        return 'recent';
      case 'GetSharedWithMe':
        return 'shared-with-me';
    }
  }

  // Shared UI helpers

  // Update this method to handle both lists
  updateFile(file: BaseFile, updates: Record<string, any>) {
    if (this.mode() === 'GetSharedWithMe') {
      this.sharedFiles.update((files) =>
        files.map((f) => (f.id === file.id ? { ...f, ...updates } : f))
      );
    } else {
      this.userFiles.update((files) =>
        files.map((f) => (f.id === file.id ? { ...f, ...updates } : f))
      );
    }
  }

  renameFileWithFeedback(file: BaseFile, newFileName: string) {
    newFileName = newFileName.trim();

    if (newFileName === '') {
      this.toast.show(
        'File rename',
        'File name cannot be empty',
        MessageSeverity.error
      );
      return;
    }

    if (newFileName === file.fileName) {
      this.editingId.set(null);
      return;
    }

    if (this.currentFiles().some((f) => f.fileName === newFileName)) {
      this.toast.show(
        'File rename',
        'File with this name already exists',
        MessageSeverity.error
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
            'File rename',
            'File renamed successfully',
            MessageSeverity.success
          );
          this.updateFile(file, { fileName: newFileName });
        },
        error: (err) => {
          this.toast.show(
            'File rename',
            err.error || String(err),
            MessageSeverity.error
          );
        },
      })
      .add(() => this.setLoading(file.id, false));
  }

  changeFilesFavouriteWithFeedback(files: AppFile[], changeTo: boolean) {
    const filesToUpdate = files.filter(
      (file) =>
        file.fileStatus === FileStatus.Completed &&
        file.isFavourite !== changeTo
    );
    if (filesToUpdate.length === 0) return;

    bulkAction<AppFile>({
      items: filesToUpdate,
      action: (file) => this.fileApiService.setFavourite(file.id, changeTo),
      beforeStart: (file) => this.setLoading(file.id, true),
      onSuccess: (file) => {
        this.updateFile(file, { isFavourite: changeTo });
        this.setLoading(file.id, false);
      },
      onError: (file, err) => {
        this.toast.show(
          'Favourite update failed',
          err.error || String(err),
          MessageSeverity.error
        );
        this.setLoading(file.id, false);
      },
      toast: (title, msg, severity) => this.toast.show(title, msg, severity),
      successMessage: (count, updated) => {
        if (count === 1) {
          return changeTo
            ? `Added '${updated[0].fileName}' to favourites`
            : `Removed '${updated[0].fileName}' from favourites`;
        }
        return changeTo
          ? `Added ${count} files to favourites`
          : `Removed ${count} files from favourites`;
      },
    });
  }

  markFilesToCopyWithFeedback(files: BaseFile[]) {
    this.setFilesMarkedForAction(files, ActionType.Copy);
    this.toast.show(
      'File Copy Initialized',
      files.length === 1
        ? `Selected '${files[0].fileName}' for copying. Navigate to the target folder and paste the file there.`
        : `Selected ${files.length} files for copying. Navigate to the target folder and paste the files there.`,
      MessageSeverity.info
    );
  }

  markFilesToMoveWithFeedback(files: BaseFile[]) {
    this.setFilesMarkedForAction(files, ActionType.Move);
    this.toast.show(
      'File Move Initialized',
      files.length === 1
        ? `Selected '${files[0].fileName}' for moving. Navigate to the target folder and paste the file there.`
        : `Selected ${files.length} files for moving. Navigate to the target folder and paste the files there.`,
      MessageSeverity.info
    );
  }

  moveFilesWithFeedback(
    filesToMove: BaseFile[],
    targetDirectoryId: number | null,
    targetDirectoryName: string
  ) {
    this.executeFileOperationWithFeedback(
      filesToMove,
      targetDirectoryId,
      targetDirectoryName,
      (ids, targetId) => this.fileApiService.moveFiles(ids, targetId),
      'move'
    );
  }

  copyFilesWithFeedback(
    filesToCopy: BaseFile[],
    targetDirectoryId: number | null,
    targetDirectoryName: string
  ) {
    this.executeFileOperationWithFeedback(
      filesToCopy,
      targetDirectoryId,
      targetDirectoryName,
      (ids, targetId) => this.fileApiService.copyFiles(ids, targetId),
      'copy'
    );
  }

  async deleteFilesWithFeedback(filesToDelete: BaseFile[]): Promise<boolean> {
    if (filesToDelete.length === 0) {
      return false;
    }

    const maxLines = 5;
    const totalFiles = filesToDelete.length;
    const fileNamesList = filesToDelete.map((f) => f.fileName);

    let confirmText = '';

    if (totalFiles === 1) {
      confirmText = `Are you sure you want to delete '${fileNamesList[0]}' file?`;
    } else if (totalFiles > maxLines) {
      const shownCount = Math.max(1, maxLines - 1);
      const shown = fileNamesList.slice(0, shownCount);
      const remainingCount = totalFiles - shownCount;
      const displayNames = [
        ...shown.map((name) => `• ${name}`),
        `...and ${remainingCount} more`,
      ];
      confirmText = `Are you sure you want to delete these files?\n${displayNames.join(
        '\n'
      )}`;
    } else {
      const displayNames = fileNamesList.map((name) => `• ${name}`);
      confirmText = `Are you sure you want to delete these files?\n${displayNames.join(
        '\n'
      )}`;
    }

    const confirmationResult = await this.modalService.confirmChoice({
      title: 'Confirm File Deletion',
      message: confirmText,
      confirmText: 'Delete',
      cancelText: 'Cancel',
      showPermanentWarning: true,
    });
    if (!confirmationResult) return false;

    bulkAction<BaseFile>({
      items: filesToDelete,
      action: (file) => this.fileApiService.deleteFile(file.id),
      beforeStart: (file) => this.setLoading(file.id, true),
      onSuccess: (file) =>
        this.userFiles.update((list) => list.filter((f) => f.id !== file.id)),
      onError: (file, err) => {
        this.toast.show(
          'File deletion',
          err instanceof Error ? err.message : String(err),
          MessageSeverity.error
        );
        this.setLoading(file.id, false);
      },
      toast: (title, msg, severity) => this.toast.show(title, msg, severity),
      successMessage: (count) => `Deleted ${count} file(s) successfully`,
    });
    return true;
  }

  private executeFileOperationWithFeedback<T>(
    files: BaseFile[],
    targetDirectoryId: number | null,
    targetDirectoryName: string,
    operation: (fileIds: number[], targetId: number | null) => Observable<T>,
    operationName: 'move' | 'copy'
  ) {
    if (files.length === 0) return;
    if (targetDirectoryName === '') targetDirectoryName = 'Root';

    files.forEach((file) => this.setLoading(file.id, true));

    const fileIds = files.map((f) => f.id);
    const isPlural = files.length > 1;

    operation(fileIds, targetDirectoryId)
      .subscribe({
        next: (result) => {
          // If you still want optimistic updates in SAME typed list, keep them,
          // but the safe baseline is to refetch after any copy/move:
          this.refreshActiveList();

          this.toast.show(
            'Success',
            `File${
              isPlural ? 's' : ''
            } ${operationName}d to '${targetDirectoryName}'.`,
            MessageSeverity.success
          );

          this.clearActionContext();
        },
        error: (err) => {
          this.toast.show(
            'Operation failed',
            `Could not ${operationName} file${isPlural ? 's' : ''}.`,
            MessageSeverity.error
          );
        },
      })
      .add(() => {
        files.forEach((file) => this.setLoading(file.id, false));
      });
  }

  addFileIfNotExists(file: AppFile) {
    if (this.userFiles().find((f) => f.id === file.id)) return;
    this.userFiles.update((files) => [...files, file]);
  }

  completeUploadFile(fileId: number): void {
    this.userFiles.update((files) =>
      files.map((file) =>
        file.id === fileId
          ? { ...file, fileStatus: FileStatus.Completed }
          : file
      )
    );
  }

  setFilesMarkedForAction(files: BaseFile[], actionType: ActionType) {
    this.actionContext.set({
      files: new Set(files),
      filesIds: new Set(files.map((f) => f.id)),
      type: actionType,
    });
  }

  clearActionContext() {
    this.actionContext.set(null);
  }

  setLoading(id: number, value: boolean) {
    this.loadingIds.update((prev) => {
      const next = new Set(prev);
      if (value) next.add(id);
      else next.delete(id);
      return next;
    });
  }

  updateFileUploadProgress(uploadProgressInfo: UploadProgressInfo) {
    this.userFiles.update((files) =>
      files.map((file) =>
        uploadProgressInfo.fileId === file.id
          ? {
              ...file,
              uploadProgress: uploadProgressInfo.progress!,
              progressStatus: this.mapStatus(uploadProgressInfo.status),
            }
          : file
      )
    );
  }

  private extractFolderId(url: string): number | null {
    const match = url.match(/folder\/(\d+)/);
    return match ? +match[1] : null;
  }

  private mapStatus(status: UploadStatus): ProgressStatus {
    switch (status) {
      case UploadStatus.InProgress:
        return ProgressStatus.Started;
      case UploadStatus.Stopping:
        return ProgressStatus.Stopping;
      default:
        return ProgressStatus.Stopped;
    }
  }
}
