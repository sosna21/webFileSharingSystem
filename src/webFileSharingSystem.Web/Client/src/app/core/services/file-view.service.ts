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
import { environment } from '../../../environments/environment';
import { AppFile } from '../models/app-file.model';
import { httpResource } from '@angular/common/http';
import { FileResponse } from '../models/file-response.model';
import { Router, NavigationEnd } from '@angular/router';
import { Breadcrumb } from '../models/breadcrumb.model';
import { FileApiService } from './api/file-api.service';
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
  firstValueFrom,
} from 'rxjs';
import {
  UploadProgressInfo,
  UploadStatus,
} from '../models/upload-progress-info.model';
import {
  BaseFile,
  FileStatus,
  ProgressStatus,
} from '../models/base-file.model';
import { SharedFile } from '../models/shared-file.model';
import { ShareAccessMode } from '../models/share-access-mode.model';
import { AuthenticationService } from './authentication.service';

export type FileViewMode =
  | 'GetAll'
  | 'GetSharedByMe'
  | 'GetFavourites'
  | 'GetRecent'
  | 'GetSharedWithMe';
type UserSortColumn =
  | 'fileName'
  | 'favourite'
  | 'share'
  | 'size'
  | 'createdByUserName'
  | 'lastModification';
type SharedSortColumn =
  | 'fileName'
  | 'sharedBy/createdBy'
  | 'accessMode'
  | 'size'
  | 'validUntil';
type SortColumn = UserSortColumn | SharedSortColumn;
type SortOption = { column: SortColumn; direction: 'asc' | 'desc' } | null;
type SortValue = string | number | boolean | null | undefined;

const USER_SORT_COLUMNS: readonly UserSortColumn[] = [
  'fileName',
  'favourite',
  'share',
  'size',
  'createdByUserName',
  'lastModification',
];
const SHARED_SORT_COLUMNS: readonly SharedSortColumn[] = [
  'fileName',
  'sharedBy/createdBy',
  'accessMode',
  'size',
  'validUntil',
];

@Injectable()
export class FileViewService {
  private readonly fileUrl = `${environment.apiUrl}/File`;
  private readonly router = inject(Router);
  private readonly fileApiService = inject(FileApiService);
  private readonly authService = inject(AuthenticationService);
  private readonly currentUrl = toSignal(
    this.router.events.pipe(
      filter((event) => event instanceof NavigationEnd),
      map(() => this.router.url),
    ),
    { initialValue: this.router.url },
  );

  public readonly mode = computed<FileViewMode>(() => {
    const url = this.currentUrl();
    if (url.includes('/shared-with-me')) return 'GetSharedWithMe';
    if (url.includes('/shared-by-me')) return 'GetSharedByMe';
    if (url.includes('/favourite')) return 'GetFavourites';
    if (url.includes('/recent')) return 'GetRecent';
    return 'GetAll';
  });

  //TODO add parent folder signal
  public readonly searchedPhrase = computed<string>(() => {
    const url = new URL(this.currentUrl(), 'http://localhost');
    return url.searchParams.get('search') ?? '';
  });

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

  public readonly sortOption = signal<SortOption>(null);

  public toggleSort(column: string, descendingFirst = false) {
    const isSharedView = this.mode() === 'GetSharedWithMe';
    let sortColumn: SortColumn;
    if (isSharedView) {
      if (!this.isSharedSortColumn(column)) return;
      sortColumn = column;
    } else {
      if (!this.isUserSortColumn(column)) return;
      sortColumn = column;
    }

    this.sortOption.update((current) => {
      if (current?.column === sortColumn) {
        if (descendingFirst) {
          return current.direction === 'desc'
            ? { column: sortColumn, direction: 'asc' }
            : null;
        }
        return current.direction === 'asc'
          ? { column: sortColumn, direction: 'desc' }
          : null;
      }
      return {
        column: sortColumn,
        direction: descendingFirst ? 'desc' : 'asc',
      };
    });
  }
  private sortUserFiles(files: AppFile[], sort: SortOption): AppFile[] {
    return files.sort((a, b) => {
      const currentUserId = this.authService.currentUser()?.id;
      const aIsOther =
        a.createdBy !== currentUserId &&
        a.fileStatus === FileStatus.Incomplete;
      const bIsOther =
        b.createdBy !== currentUserId &&
        b.fileStatus === FileStatus.Incomplete;
      if (aIsOther !== bIsOther) {
        return aIsOther ? -1 : 1;
      }

      if (sort && this.isUserSortColumn(sort.column)) {
        const values = this.userSortValues(a, b, sort.column);
        const comparison = this.compareSortValues(values[0], values[1]);
        if (comparison !== 0)
          return sort.direction === 'asc' ? comparison : -comparison;
      }

      return a.fileName.localeCompare(b.fileName);
    });
  }

  private sortSharedFiles(files: SharedFile[], sort: SortOption): SharedFile[] {
    return files.sort((a, b) => {
      if (sort && this.isSharedSortColumn(sort.column)) {
        const values = this.sharedSortValues(a, b, sort.column);
        const comparison = this.compareSortValues(values[0], values[1]);
        if (comparison !== 0)
          return sort.direction === 'asc' ? comparison : -comparison;
      }
      return a.fileName.localeCompare(b.fileName);
    });
  }

  private userSortValues(
    a: AppFile,
    b: AppFile,
    column: UserSortColumn,
  ): [SortValue, SortValue] {
    switch (column) {
      case 'fileName':
        return [a.fileName, b.fileName];
      case 'favourite':
        return [a.isFavourite, b.isFavourite];
      case 'share':
        return [a.isShared, b.isShared];
      case 'size':
        return [a.size, b.size];
      case 'createdByUserName':
        return [a.createdByUserName, b.createdByUserName];
      case 'lastModification':
        return [a.modificationDate, b.modificationDate];
      default:
        return [null, null];
    }
  }

  private sharedSortValues(
    a: SharedFile,
    b: SharedFile,
    column: SharedSortColumn,
  ): [SortValue, SortValue] {
    switch (column) {
      case 'fileName':
        return [a.fileName, b.fileName];
      case 'sharedBy/createdBy':
        return this.parentId()
          ? [a.createdByUserName, b.createdByUserName]
          : [a.sharedUserName, b.sharedUserName];
      case 'accessMode':
        return [a.accessMode, b.accessMode];
      case 'size':
        return [a.size, b.size];
      case 'validUntil':
        return [a.validUntil, b.validUntil];
      default:
        return [null, null];
    }
  }

  private compareSortValues(a: SortValue, b: SortValue): number {
    if (typeof a === 'string' && typeof b === 'string')
      return a.localeCompare(b);
    if (typeof a === 'boolean' && typeof b === 'boolean')
      return a === b ? 0 : a ? 1 : -1;
    if (a != null && b != null) return a < b ? -1 : a > b ? 1 : 0;
    if (a != null) return 1;
    if (b != null) return -1;
    return 0;
  }

  private isUserSortColumn(column: string): column is UserSortColumn {
    return USER_SORT_COLUMNS.some((supported) => supported === column);
  }

  private isSharedSortColumn(column: string): column is SharedSortColumn {
    return SHARED_SORT_COLUMNS.some((supported) => supported === column);
  }

  public readonly userFiles = computed(() => {
    const files = [...this._userFiles()];
    return this.sortUserFiles(files, this.sortOption());
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
    return this.sortSharedFiles(files, this.sortOption());
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

  private readonly _request = computed(
    () => `${
      this.fileUrl
    }/${this.mode()}?PageNumber=${this.currentPage()}&PageSize=${this.itemsPerPage()}
      ${this.parentId() ? '&ParentId=' + this.parentId() : ''}${
        this.searchedPhrase() !== ''
          ? '&SearchedPhrase=' + this.searchedPhrase()
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

  reloadCurrentList() {
    this.refreshActiveList();
  }

  readonly _fileResource = httpResource<FileResponse<AppFile>>(() =>
    this.mode() !== 'GetSharedWithMe' ? this._request() : undefined,
  );
  readonly _sharedFilesResource = httpResource<FileResponse<SharedFile>>(() =>
    this.mode() === 'GetSharedWithMe' ? this._request() : undefined,
  );
  readonly currentResource = computed(() => {
    return this.mode() === 'GetSharedWithMe'
      ? this._sharedFilesResource
      : this._fileResource;
  });

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
  private readonly currentResourceStatus = computed(() =>
    this.currentResource().status(),
  );
  private readonly currentResourceStatus$ = toObservable(
    this.currentResourceStatus,
  );

  private async waitForNextResourceReload(status$: Observable<string>) {
    await firstValueFrom(
      status$.pipe(filter((status) => status === 'loading')),
    );
    await firstValueFrom(
      status$.pipe(filter((status) => status === 'resolved')),
    );
  }

  async waitForNextCurrentReload() {
    await this.waitForNextResourceReload(this.currentResourceStatus$);
  }

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

    const crumbs = [homeCrumb, ...breadcrumbs].sort(
      (a, b) => a.level - b.level,
    );

    if (
      //this._debouncedSearchedPhrase()?.trim() &&
      this.searchedPhrase()?.trim()
    ) {
      crumbs.push({
        id: -999, // Dummy ID for search result breadcrumb
        fileName: $localize`Search result`,
        level: crumbs.length,
        accessMode: ShareAccessMode.ReadOnly,
      });
    }

    return crumbs;
  });

  goToFolder(folderId: number | null) {
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

  setSearchPhrase(phrase: string) {
    const urlTree = this.router.parseUrl(this.router.url);
    const currentPhrase = (urlTree.queryParams['search'] ?? '').trim();
    const nextPhrase = phrase.trim();

    if (nextPhrase) {
      urlTree.queryParams['search'] = nextPhrase;
    } else {
      delete urlTree.queryParams['search'];
    }
    const shouldPushHistory = currentPhrase === '' && nextPhrase !== '';
    this.router.navigateByUrl(urlTree, { replaceUrl: !shouldPushHistory });
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
        return $localize`Home`;
      case 'GetSharedByMe':
        return $localize`Shared By Me`;
      case 'GetFavourites':
        return $localize`Favourites`;
      case 'GetRecent':
        return $localize`Recent`;
      case 'GetSharedWithMe':
        return $localize`Shared With Me`;
    }
  }

  addUserFileIfNotExists(file: AppFile) {
    if (this._userFiles().some((current) => current.id === file.id)) return;
    this._userFiles.update((files) => [...files, file]);
  }

  addSharedFileIfNotExists(file: SharedFile) {
    if (this._sharedFiles().some((current) => current.id === file.id)) return;
    this._sharedFiles.update((files) => [...files, file]);
  }

  updateUserFile(fileId: number, updates: Partial<AppFile>) {
    this._userFiles.update((files) =>
      files.map((file) =>
        file.id === fileId ? { ...file, ...updates } : file,
      ),
    );
  }

  updateSharedFile(fileId: number, updates: Partial<SharedFile>) {
    this._sharedFiles.update((files) =>
      files.map((file) =>
        file.id === fileId ? { ...file, ...updates } : file,
      ),
    );
  }

  removeUserFiles(fileIds: ReadonlySet<number>) {
    this._userFiles.update((files) =>
      files.filter((file) => !fileIds.has(file.id)),
    );
  }

  removeSharedFiles(fileIds: ReadonlySet<number>) {
    this._sharedFiles.update((files) =>
      files.filter((file) => !fileIds.has(file.id)),
    );
  }

  updateFileUploadProgress(uploadProgressInfo: UploadProgressInfo) {
    if (uploadProgressInfo.fileId === null) return;
    const updates = {
      uploadProgress: uploadProgressInfo.progress ?? null,
      progressStatus: this.mapStatus(uploadProgressInfo.status),
    };

    if (this.mode() === 'GetSharedWithMe') {
      this.updateSharedFile(uploadProgressInfo.fileId, updates);
    } else {
      this.updateUserFile(uploadProgressInfo.fileId, updates);
    }
  }

  completeUploadFile(fileId: number) {
    if (this.mode() === 'GetSharedWithMe') {
      this.updateSharedFile(fileId, { fileStatus: FileStatus.Completed });
    } else {
      this.updateUserFile(fileId, { fileStatus: FileStatus.Completed });
    }
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