import {
  computed,
  inject,
  Injectable,
  linkedSignal,
  signal,
} from '@angular/core';
import {
  takeUntilDestroyed,
  toObservable,
  toSignal,
} from '@angular/core/rxjs-interop';
import { environment } from '../../../environments/environment.development';
import { AppFile } from '../models/app-file.model';
import { httpResource } from '@angular/common/http';
import { FileResponse } from '../models/file-response.model';
import { debouncedSignal } from '../utils/signal-utils';
import { Router, NavigationEnd } from '@angular/router';
import { Breadcrumb } from '../models/breadcrumb.model';
import {
  Observable,
  filter,
  map,
  switchMap,
  interval,
  catchError,
  EMPTY,
  tap,
  of,
} from 'rxjs';
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
import {
  BaseFile,
  FileStatus,
  ProgressStatus,
} from '../models/base-file.model';
import { SharedFile } from '../models/shared-file.model';
import { ShareAccessMode } from '../models/share-access-mode.model';
import { StorageService } from './storage.service';
import { AuthenticationService } from './authentication.service';

@Injectable()
export class FileService {
  private readonly fileUrl = `${environment.apiUrl}/File`;
  private readonly router = inject(Router);
  private readonly fileApiService = inject(FileApiService);
  private readonly authService = inject(AuthenticationService);
  private readonly storage = inject(StorageService);
  private readonly toast = inject(ToastService);
  private readonly modalService = inject(ModalService);
  private readonly actionContext = linkedSignal<
    Record<number, BaseFile>,
    { files: Set<BaseFile>; filesIds: Set<number>; type: ActionType } | null
  >({
    source: () =>
      Object.fromEntries(
        this._userFiles().map((item) => [item.id, item]),
      ) as Record<string, BaseFile>,
    computation: (source, previous) => {
      if (!previous || !previous.value?.files) return null;
      const resultFiles = [...previous.value.files].map(
        (f) => source[f.id] ?? f,
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

  private readonly currentUrl = toSignal(
    this.router.events.pipe(
      filter((event) => event instanceof NavigationEnd),
      map(() => this.router.url),
    ),
    { initialValue: this.router.url },
  );

  public readonly mode = computed<
    | 'GetAll'
    | 'GetSharedByMe'
    | 'GetFavourites'
    | 'GetRecent'
    | 'GetSharedWithMe'
  >(() => {
    const url = this.currentUrl();
    if (url.includes('/shared-with-me')) return 'GetSharedWithMe';
    if (url.includes('/shared-by-me')) return 'GetSharedByMe';
    if (url.includes('/favourite')) return 'GetFavourites';
    if (url.includes('/recent')) return 'GetRecent';
    return 'GetAll';
  });

  //TODO add parent folder signal
  public readonly searchedPhrase = signal<string>('');
  public readonly parentId = computed<number | null>(() =>
    this.extractFolderId(this.currentUrl()),
  );

  public readonly parentBreadcrumb = computed(() =>
    this.breadCrumbsResource.isLoading()
      ? undefined
      : this.breadCrumbs().at(-1),
  );
  public readonly parentName = computed(
    () => this.parentBreadcrumb()?.fileName,
  );

  public readonly isParentMinWriteAccess = computed(
    () => this.parentBreadcrumb()?.accessMode !== ShareAccessMode.ReadOnly,
  );

  public readonly currentPage = signal<number>(1);
  public readonly itemsPerPage = signal<number>(9999);
  private readonly _userFiles = linkedSignal<
    FileResponse<AppFile> | undefined,
    AppFile[]
  >({
    source: () => this._linkedFilesResponse(),
    computation: (source, previous) => {
      const prevProgress = new Map(
        previous?.value?.map((f) => [f.id, f.progressStatus]) ?? [],
      );

      return (
        source?.items.map((file) => ({
          ...file,
          progressStatus: prevProgress.get(file.id) ?? ProgressStatus.Stopped,
        })) ?? []
      );
    },
  });

  public readonly sortOption = signal<{
    column: string;
    direction: 'asc' | 'desc';
  } | null>(null);

  public toggleSort(column: string) {
    this.sortOption.update((current) => {
      if (current?.column === column) {
        if (current.direction === 'asc') {
          return { column, direction: 'desc' };
        } else {
          return null;
        }
      }
      return { column, direction: 'asc' };
    });
  }

  private sortFiles<T extends BaseFile>(
    files: T[],
    sort: { column: string; direction: 'asc' | 'desc' } | null,
    isUserFiles: boolean,
  ): T[] {
    return files.sort((a, b) => {
      if (isUserFiles) {
        const currentUserId = this.authService.currentUser()?.id;
        const aIsOther =
          a.createdBy !== currentUserId &&
          a.fileStatus === FileStatus.Incomplete;
        const bIsOther =
          b.createdBy !== currentUserId &&
          b.fileStatus === FileStatus.Incomplete;
        if (aIsOther !== bIsOther) {
          // Uploading files, not created by user go first
          return aIsOther ? -1 : 1;
        }
      }

      if (sort) {
        let valA: any;
        let valB: any;

        switch (sort.column) {
          case 'fileName':
            valA = a.fileName;
            valB = b.fileName;
            break;
          case 'size':
            valA = a.size;
            valB = b.size;
            break;
          case 'lastModification':
            valA = (a as any).modificationDate;
            valB = (b as any).modificationDate;
            break;
          case 'createdByUserName':
            valA = a.createdByUserName;
            valB = b.createdByUserName;
            break;
          case 'favourite':
            valA = !!(a as any).isFavourite;
            valB = !!(b as any).isFavourite;
            break;
          case 'share':
            valA = !!(a as any).isShared;
            valB = !!(b as any).isShared;
            break;
          case 'validUntil':
            valA = a.validUntil;
            valB = b.validUntil;
            break;
          case 'accessMode':
            valA = a.accessMode;
            valB = b.accessMode;
            break;
          case 'sharedBy/createdBy':
            valA = this.parentId()
              ? a.createdByUserName
              : (a as any).sharedUserName;
            valB = this.parentId()
              ? b.createdByUserName
              : (b as any).sharedUserName;
            break;
          default:
            valA = (a as any)[sort.column];
            valB = (b as any)[sort.column];
        }

        let comparison = 0;
        if (typeof valA === 'string' && typeof valB === 'string') {
          comparison = valA.localeCompare(valB);
        } else if (typeof valA === 'boolean' && typeof valB === 'boolean') {
          comparison = valA === valB ? 0 : valA ? 1 : -1;
        } else if (valA != null && valB != null) {
          comparison = valA < valB ? -1 : valA > valB ? 1 : 0;
        } else if (valA != null) {
          comparison = 1;
        } else if (valB != null) {
          comparison = -1;
        }

        if (comparison !== 0) {
          return sort.direction === 'asc' ? comparison : -comparison;
        }
      }

      // Default sorting by fileName
      return a.fileName.localeCompare(b.fileName);
    });
  }

  public readonly userFiles = computed(() => {
    const files = [...this._userFiles()];
    return this.sortFiles(files, this.sortOption(), true);
  });

  private readonly _sharedFiles = linkedSignal<
    FileResponse<SharedFile> | undefined,
    SharedFile[]
  >({
    source: () => this._linkedSharedFilesResponse(),
    computation: (source, previous) => {
      const prevProgress = new Map(
        previous?.value?.map((f) => [f.id, f.progressStatus]) ?? [],
      );

      return (
        source?.items.map((file) => ({
          ...file,
          progressStatus: prevProgress.get(file.id) ?? ProgressStatus.Stopped,
        })) ?? []
      );
    },
  });

  public readonly sharedFiles = computed(() => {
    const files = [...this._sharedFiles()];
    return this.sortFiles(files, this.sortOption(), false);
  });

  public readonly currentFiles = computed<(AppFile | SharedFile)[]>(() => {
    return this.mode() === 'GetSharedWithMe'
      ? this._sharedFiles()
      : this._userFiles();
  });

  readonly names = computed(
    () => new Set(this.currentFiles().map((file) => file.fileName)),
  );

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
      : null,
  );

  private readonly _debouncedSearchedPhrase = debouncedSignal(
    this.searchedPhrase,
    300,
    '',
  );
  private readonly _request = computed(
    () => `${
      this.fileUrl
    }/${this.mode()}?PageNumber=${this.currentPage()}&PageSize=${this.itemsPerPage()}
      ${this.parentId() ? '&ParentId=' + this.parentId() : ''}${
        this._debouncedSearchedPhrase() !== ''
          ? '&SearchedPhrase=' + this._debouncedSearchedPhrase()
          : ''
      }`,
  );

  constructor() {
    toObservable(this.parentId)
      .pipe(
        switchMap(() => interval(3000)),
        switchMap((tick) => {
          if (tick % 5 === 4) {
            this.refreshActiveList();
            return EMPTY;
          }

          const hasThirdPartyActiveUploads = this.currentFiles().some(
            (file) =>
              file.fileStatus === FileStatus.Incomplete &&
              file.createdBy !== this.authService.currentUser()?.id,
          );

          if (hasThirdPartyActiveUploads) {
            return this.fileApiService.getActiveUploads(this.parentId()).pipe(
              catchError(() => of([])),
              tap((uploads) => {
                uploads.forEach((upload) => {
                  if (upload.status === FileStatus.Completed) {
                    this.completeUploadFile(upload.fileId);
                  } else {
                    this.updateFileUploadProgress({
                      fileId: upload.fileId,
                      progress: upload.uploadProgress,
                      status: UploadStatus.Stopped,
                    });
                  }
                });
              }),
            );
          }

          return EMPTY;
        }),
        takeUntilDestroyed(),
      )
      .subscribe();
  }

  private refreshActiveList() {
    if (this.mode() === 'GetSharedWithMe') {
      this._sharedFilesResource.reload();
    } else {
      this._fileResource.reload();
    }
  }

  readonly _fileResource = httpResource<FileResponse<AppFile>>(() =>
    this.mode() !== 'GetSharedWithMe' ? this._request() : undefined,
  );
  readonly _sharedFilesResource = httpResource<FileResponse<SharedFile>>(() =>
    this.mode() === 'GetSharedWithMe' ? this._request() : undefined,
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
      : undefined,
  );

  private readonly _breadCrumbsResource = httpResource<Breadcrumb[]>(
    () => this._breadcrumbsQuery(),
    {
      parse: (value: unknown) => {
        return (value as Breadcrumb[]).map((crumb: Breadcrumb) => ({
          ...crumb,
          accessMode: crumb.accessMode ?? undefined,
          validUntil:
            crumb.validUntil ?? (crumb.accessMode === null ? undefined : null),
        }));
      },
    },
  );
  public readonly breadCrumbsResource = this._breadCrumbsResource.asReadonly();

  public readonly breadCrumbs = computed<Breadcrumb[]>(() => {
    const breadcrumbs = this.breadCrumbsResource.hasValue()
      ? this.breadCrumbsResource.value()
      : [];

    const homeCrumb: Breadcrumb = {
      id: null,
      fileName: this.mapModeToFolderName(this.mode()),
      level: 0,
      accessMode:
        this.mode() === 'GetAll' ? undefined : ShareAccessMode.ReadOnly,
      validUntil: this.mode() === 'GetSharedWithMe' ? null : undefined,
    };
    return [homeCrumb, ...breadcrumbs].sort((a, b) => a.level - b.level);
  });

  goToFolder(folderId: number | null) {
    this.searchedPhrase.set('');
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
      | 'GetSharedWithMe',
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

  private mapModeToFolderName(
    mode:
      | 'GetAll'
      | 'GetSharedByMe'
      | 'GetFavourites'
      | 'GetRecent'
      | 'GetSharedWithMe',
  ) {
    switch (mode) {
      case 'GetAll':
        return 'Home';
      case 'GetSharedByMe':
        return 'Shared By Me';
      case 'GetFavourites':
        return 'Favourites';
      case 'GetRecent':
        return 'Recent';
      case 'GetSharedWithMe':
        return 'Shared With Me';
    }
  }

  // Shared UI helpers

  // Update this method to handle both lists
  updateFile(file: BaseFile, updates: Record<string, any>) {
    if (this.mode() === 'GetSharedWithMe') {
      this._sharedFiles.update((files) =>
        files.map((f) => (f.id === file.id ? { ...f, ...updates } : f)),
      );
    } else {
      this._userFiles.update((files) =>
        files.map((f) => (f.id === file.id ? { ...f, ...updates } : f)),
      );
    }
  }

  renameFileWithFeedback(file: BaseFile, newFileName: string) {
    newFileName = newFileName.trim();

    if (newFileName === '') {
      this.toast.show(
        'File rename',
        'File name cannot be empty',
        MessageSeverity.error,
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
            'File rename',
            'File renamed successfully',
            MessageSeverity.success,
          );
          this.updateFile(file, { fileName: newFileName });
        },
        error: (err) => {
          this.toast.show(
            'File rename',
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
        this.updateFile(file, { isFavourite: changeTo });
        this.setLoading(file.id, false);
      },
      onError: (file, err) => {
        this.toast.show(
          'Favourite update failed',
          err.error || String(err),
          MessageSeverity.error,
        );
        this.setLoading(file.id, false);
      },
      toast: (title, msg, severity) => this.toast.show(title, msg, severity),
      successMessage: (count, updated) => {
        if (count === 1) {
          return changeTo
            ? {
                title: 'Favourite Update',
                message: `Added '${updated[0].fileName}' to favourites`,
              }
            : {
                title: 'Favourite Update',
                message: `Removed '${updated[0].fileName}' from favourites`,
              };
        }
        return changeTo
          ? {
              title: 'Favourite Update',
              message: `Added ${count} files to favourites`,
            }
          : {
              title: 'Favourite Update',
              message: `Removed ${count} files from favourites`,
            };
      },
    });
  }

  createDirectoryWithFeedback(
    directoryName: string,
    setSelection?: (value: Set<number>) => void,
  ) {
    this.fileApiService
      .createDirectory(directoryName, this.parentId())
      .subscribe({
        next: (response) => {
          this.refreshActiveList();
          if (setSelection) {
            setSelection(new Set([response.id]));
          }
          this.toast.show(
            'New directory created',
            `Directory "${response.fileName}" has been created`,
            MessageSeverity.success,
          );
        },
        error: (error) => {
          this.toast.show(
            'Error creating directory',
            error?.error,
            MessageSeverity.error,
          );
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
      MessageSeverity.info,
    );
  }

  markFilesToMoveWithFeedback(files: BaseFile[]) {
    this.setFilesMarkedForAction(files, ActionType.Move);
    this.toast.show(
      'File Move Initialized',
      files.length === 1
        ? `Selected '${files[0].fileName}' for moving. Navigate to the target folder and paste the file there.`
        : `Selected ${files.length} files for moving. Navigate to the target folder and paste the files there.`,
      MessageSeverity.info,
    );
  }

  pasteFilesWithFeedback(setSelection?: (value: Set<number>) => void) {
    const action = this.awaitingActionState();
    if (!action) return;
    if (action.type === ActionType.Move) {
      this.moveFilesWithFeedback(
        Array.from(action.files),
        this.parentId(),
        this.parentName() ?? 'home directory',
        setSelection,
      );
    } else if (action.type === ActionType.Copy) {
      this.copyFilesWithFeedback(
        Array.from(action.files),
        this.parentId(),
        this.parentName() ?? 'home directory',
        setSelection,
      );
    }

    this.clearActionContext();
  }

  moveFilesWithFeedback(
    filesToMove: BaseFile[],
    targetDirectoryId: number | null,
    targetDirectoryName: string,
    setSelection?: (value: Set<number>) => void,
  ) {
    this.executeFileOperationWithFeedback(
      filesToMove,
      targetDirectoryId,
      targetDirectoryName,
      (ids, targetId) => this.fileApiService.moveFiles(ids, targetId),
      'move',
      setSelection,
    );
  }

  copyFilesWithFeedback(
    filesToCopy: BaseFile[],
    targetDirectoryId: number | null,
    targetDirectoryName: string,
    setSelection?: (value: Set<number>) => void,
  ) {
    this.executeFileOperationWithFeedback(
      filesToCopy,
      targetDirectoryId,
      targetDirectoryName,
      (ids, targetId) => this.fileApiService.copyFiles(ids, targetId),
      'copy',
      setSelection,
    );
  }

  async deleteFilesWithFeedback(filesToDelete: BaseFile[]): Promise<boolean> {
    if (filesToDelete.length === 0) {
      return false;
    }

    const maxLines = 5;
    const totalFiles = filesToDelete.length;
    const fileNamesList = filesToDelete.map((f) => f.fileName);

    const areFilesUploaded = filesToDelete.every(
      (file) => file.fileStatus === FileStatus.Completed,
    );
    let confirmText = '';

    if (totalFiles === 1) {
      confirmText = areFilesUploaded
        ? `Are you sure you want to delete '${fileNamesList[0]}' file?`
        : `Are you sure you want to cancel upload for '${fileNamesList[0]}' file?`;
    } else {
      let displayNames: string[] = [];
      if (totalFiles > maxLines) {
        const shownCount = Math.max(1, maxLines - 1);
        const shown = fileNamesList.slice(0, shownCount);
        const remainingCount = totalFiles - shownCount;
        displayNames = [
          ...shown.map((name) => `• ${name}`),
          `...and ${remainingCount} more`,
        ];
      } else {
        displayNames = fileNamesList.map((name) => `• ${name}`);
      }

      confirmText =
        (areFilesUploaded
          ? 'Are you sure you want to delete these files?'
          : `Are you sure you want to cancel upload for these files?`) +
        `\n${displayNames.join('\n')}`;
    }

    const confirmationResult = await this.modalService.confirmChoice({
      title: areFilesUploaded
        ? 'Confirm File Deletion'
        : 'Confirm Upload Cancellation',
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
      onSuccess: (file) => {
        this.mode() === 'GetSharedWithMe'
          ? this._sharedFiles.update((list) =>
              list.filter((f) => f.id !== file.id),
            )
          : this._userFiles.update((list) =>
              list.filter((f) => f.id !== file.id),
            );

        if (this.mode() !== 'GetSharedWithMe') {
          this.storage.updateCurrentUserUsedSpace(-file.size);
        }
      },
      onError: (file, err) => {
        this.toast.show(
          'File deletion',
          err instanceof Error ? err.message : String(err),
          MessageSeverity.error,
        );
        this.setLoading(file.id, false);
      },
      toast: (title, msg, severity) => this.toast.show(title, msg, severity),
      successMessage: (count) => {
        if (count === 1) {
          return {
            title: areFilesUploaded ? 'File Deletion' : 'Upload Cancellation',
            message: areFilesUploaded
              ? `Deleted '${filesToDelete[0].fileName}' successfully`
              : `Cancelled upload for '${filesToDelete[0].fileName}' successfully`,
          };
        } else {
          return {
            title: areFilesUploaded ? 'File Deletion' : 'Upload Cancellation',
            message: areFilesUploaded
              ? `Deleted ${count} files successfully`
              : `Cancelled upload for ${count} files successfully`,
          };
        }
      },
    });
    return true;
  }

  private executeFileOperationWithFeedback<T>(
    files: BaseFile[],
    targetDirectoryId: number | null,
    targetDirectoryName: string,
    operation: (fileIds: number[], targetId: number | null) => Observable<T>,
    operationName: 'move' | 'copy',
    setSelection?: (value: Set<number>) => void,
  ) {
    if (files.length === 0) return;
    if (targetDirectoryName === '') targetDirectoryName = 'Root';

    files.forEach((file) => this.setLoading(file.id, true));

    const fileIds = files.map((f) => f.id);
    const isPlural = files.length > 1;

    operation(fileIds, targetDirectoryId)
      .subscribe({
        next: (result) => {
          this.refreshActiveList();

          this.toast.show(
            'Success',
            `File${
              isPlural ? 's' : ''
            } ${operationName}d to '${targetDirectoryName}'.`,
            MessageSeverity.success,
          );

          this.clearActionContext();
          if (setSelection) {
            setSelection(new Set((result as BaseFile[]).map((f) => f.id)));
          }

          if (operationName === 'copy' && this.mode() !== 'GetSharedWithMe') {
            this.storage.updateCurrentUserUsedSpace(
              (result as BaseFile[]).reduce((acc, file) => acc + file.size, 0),
            );
          }
        },
        error: (err) => {
          this.toast.show(
            `${operationName[0].toUpperCase() + operationName.slice(1)} failed`,
            err?.error ??
              `Could not ${operationName} file${isPlural ? 's' : ''}.`,
            MessageSeverity.error,
          );
        },
      })
      .add(() => {
        files.forEach((file) => this.setLoading(file.id, false));
      });
  }

  addFileIfNotExists(file: AppFile | SharedFile) {
    if (this.mode() === 'GetSharedWithMe') {
      const fileToAdd = file as SharedFile;
      if (this._sharedFiles().find((f) => f.id === file.id)) return;
      this._sharedFiles.update((files) => [...files, fileToAdd]);
    } else {
      const fileToAdd = file as AppFile;
      if (this._userFiles().find((f) => f.id === file.id)) return;
      this._userFiles.update((files) => [...files, fileToAdd]);
    }
  }

  completeUploadFile(fileId: number): void {
    const currentFilesSignal =
      this.mode() === 'GetSharedWithMe' ? this._sharedFiles : this._userFiles;

    currentFilesSignal.update((files: any[]) =>
      files.map((file) =>
        file.id === fileId
          ? { ...file, fileStatus: FileStatus.Completed }
          : file,
      ),
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
    const currentFilesSignal =
      this.mode() === 'GetSharedWithMe' ? this._sharedFiles : this._userFiles;
    currentFilesSignal.update((files: any[]) =>
      files.map((file) =>
        uploadProgressInfo.fileId === file.id
          ? {
              ...file,
              uploadProgress: uploadProgressInfo.progress!,
              progressStatus: this.mapStatus(uploadProgressInfo.status),
            }
          : file,
      ),
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
