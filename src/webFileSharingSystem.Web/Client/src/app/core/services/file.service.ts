import { computed, inject, Injectable, linkedSignal, OnInit, signal } from '@angular/core';
import { environment } from '../../../environments/environment.development';
import { AppFile, FileStatus, ProgressStatus } from '../models/app-file.model';
import { HttpClient, httpResource } from '@angular/common/http';
import { FileResponse } from '../models/file-response.model';
import { debouncedSignal } from '../utils/signal-utils';
import { Router } from '@angular/router';
import { Breadcrumb } from '../models/breadcrumb.model';
import { Observable, tap } from 'rxjs';
import { AuthenticationService } from './authentication.service';
import { ActionType } from '../models/action-type.model';
import { ToastService } from './toast.service';
import { MessageSeverity } from '../models/toast-info.model';
import { UploadProgressInfo, UploadStatus } from '../models/upload-progress-info.model';

@Injectable({
  providedIn: 'root'
})
export class FileService {
  private readonly fileUrl = `${environment.apiUrl}/File`;
  private readonly sharesUrl = `${environment.apiUrl}/Share`;
  private readonly router = inject(Router);
  private readonly authService = inject(AuthenticationService);
  private readonly http = inject(HttpClient);
  private readonly toast = inject(ToastService);
  private readonly actionContext = linkedSignal<Record<number, AppFile>, { files: Set<AppFile>, filesIds: Set<number>, type: ActionType } | null>({
    source: () => Object.fromEntries(
      this.files().map(item => [item.id, item])
    ) as Record<string, AppFile>,
    computation: (source, previous) => {
      if (!previous || !previous.value?.files)
        return null;
      const resultFiles = [...previous.value.files].map(f => source[f.id] ?? f);

      //Return updated files set
      return { files: new Set(resultFiles), filesIds: previous.value.filesIds, type: previous.value.type };
    }
  });
  readonly waitingForAction = this.actionContext.asReadonly();

  public readonly mode = signal<'GetAll' | 'GetSharedWithMe' | 'GetSharedByMe' | 'GetFavourites' | 'GetRecent'>('GetAll');
  public readonly searchedPhrase = signal<string>('');
  public readonly parentId = signal<number | null>(null);
  public readonly parentName = computed(() => this.breadCrumbsResource.hasValue() ? this.breadCrumbsResource.value().find(b => b.id === this.parentId())?.fileName : '');

  public readonly currentPage = signal<number>(1);
  public readonly itemsPerPage = signal<number>(9999);
  public readonly files = linkedSignal<AppFile[]>(() => this._linkedFilesResponse()?.items.map(file => ({ ...file, progressStatus: ProgressStatus.Stopped })).sort((a, b) => a.fileName.localeCompare(b.fileName)) ?? []);
  public readonly pagainationData = computed(() => this._linkedFilesResponse() ? ({
    currentPage: this.currentPage(),
    itemsPerPage: this.itemsPerPage(),
    totalItems: this._linkedFilesResponse()!.totalCount,
    totalPages: this._linkedFilesResponse()!.totalPages
  }) : null);

  private readonly currentBaseUrl = computed(() => {
    return this.mode() === 'GetSharedWithMe' ? this.sharesUrl : this.fileUrl;
  });
  private readonly _debouncedSearchedPhrase = debouncedSignal(this.searchedPhrase, 300, '');
  private readonly _request = computed(() => `${this.currentBaseUrl()}/${this.mode()}?PageNumber=${this.currentPage()}&PageSize=${this.itemsPerPage()}
      ${this.parentId() ? '&ParentId=' + this.parentId() : ''}${(this._debouncedSearchedPhrase() !== '') ? '&SearchedPhrase=' + this._debouncedSearchedPhrase() : ''}`);
  readonly _fileResource = httpResource<FileResponse>(() => this._request());

  private readonly _linkedFilesResponse = linkedSignal<FileResponse | undefined, FileResponse | undefined>({
    source: () => this._fileResource.value(),
    computation: (source, previous) => {
      if (source === undefined && previous?.value !== undefined) {
        return previous?.value;
      }
      return source;
    }
  });
  public readonly fileResource = this._fileResource.asReadonly();

  //breadcumbs
  private readonly _breadcrumbsQuery = computed(() => this.parentId() !== null ? `${this.fileUrl}/GetFilePath/${this.parentId()}` : undefined);
  private readonly _breadCrumbsResource = httpResource<Breadcrumb[]>(() => this._breadcrumbsQuery());
  public readonly breadCrumbsResource = this._breadCrumbsResource.asReadonly();



  goToFolder(folderId: number | null) {
    this.parentId.set(folderId);

    if (folderId === null)
      this.router.navigate(['/disc', 'home']);
    else
      this.router.navigate(
        ['/disc', 'home', 'folder', folderId]
      );
  }

  renameFile(id: number, newFileName: string) {
    const api = `${this.currentBaseUrl()}/Rename/${id}?name=${newFileName}`;
    return this.http.put(api, null);
  }

  setFavourite(file: AppFile) {
    const api = `${this.fileUrl}/SetFavourite/${file.id}?value=${!file.isFavourite}`;
    return this.http.put(api, null);
  }

  createDirectory(name: string) {
    const api = `${this.fileUrl}/CreateDir/${name}${this.parentId() ? '?parentId=' + this.parentId() : ''}`;
    return this.http.post<AppFile>(api, null);
  }

  moveFiles(filesIds: number[], targetDirectoryId: number | null) {
    const api = `${this.currentBaseUrl()}/Move/${targetDirectoryId ?? -1}`;
    return this.http.put(api, filesIds);
  }

  copyFiles(filesIds: number[], targetDirectoryId: number | null) {
    const api = `${this.currentBaseUrl()}/Copy/${targetDirectoryId ?? -1}`;
    return this.http.post<AppFile[]>(api, filesIds);
  }

  moveFilesWithFeedback(filesToMove: AppFile[], targetDirectoryId: number | null, targetDirectoryName: string) {
    this.executeFileOperationWithFeedback(
      filesToMove,
      targetDirectoryId,
      targetDirectoryName,
      (ids, targetId) => this.moveFiles(ids, targetId),
      'move',
      (currentFiles, _, fileIds) => currentFiles.filter(f => !fileIds.includes(f.id))
    );
  }

  copyFilesWithFeedback(filesToCopy: AppFile[], targetDirectoryId: number | null, targetDirectoryName: string) {
    this.executeFileOperationWithFeedback(
      filesToCopy,
      targetDirectoryId,
      targetDirectoryName,
      (ids, targetId) => this.copyFiles(ids, targetId),
      'copy',
      (currentFiles, newFiles) => [...currentFiles, ...(newFiles as AppFile[])]
    );
  }

  private executeFileOperationWithFeedback<T>(
    files: AppFile[],
    targetDirectoryId: number | null,
    targetDirectoryName: string,
    operation: (fileIds: number[], targetId: number | null) => Observable<T>,
    operationName: 'move' | 'copy',
    updateFilesList: (currentFiles: AppFile[], operationResult: T, fileIds: number[]) => AppFile[]
  ) {
    if (files.length === 0) return;

    // Set loading state
    files.forEach(file => this.updateFile(file, { loading: true }));

    const fileIds = files.map(f => f.id);
    const isPlural = files.length > 1;
    const operationPastTense = operationName === 'move' ? 'moved' : 'copied';
    const operationPastTenseCapitalized = operationPastTense.charAt(0).toUpperCase() + operationPastTense.slice(1);

    operation(fileIds, targetDirectoryId).subscribe({
      next: (result) => {
        // Update files list based on operation type
        this.files.update(currentFiles => updateFilesList(currentFiles, result, fileIds));

        this.toast.show(
          isPlural ? `Files ${operationPastTense}` : `File ${operationPastTense}`,
          isPlural
            ? `${operationPastTenseCapitalized} ${files.length} file(s) to '${targetDirectoryName}'`
            : `${operationPastTenseCapitalized} '${files[0].fileName}' to '${targetDirectoryName}'`,
          MessageSeverity.success
        );
      },
      error: (err) => {
        // Reset loading state on error
        files.forEach(f => this.updateFile(f, { loading: false }));

        let errorMessage = `File ${operationName} failed. Please try again.`;
        if (err.error?.errors) {
          errorMessage = Object.values(err.error.errors).flat().join(' ');
        } else if (err.error) {
          errorMessage = err.error;
        }
        this.toast.show(`File ${operationName} failed`, errorMessage, MessageSeverity.error);
      }
    });
  }

  deleteFile(file: AppFile) {
    const api = `${this.currentBaseUrl()}/Delete/${file.id}`;
    return this.http.delete(api).pipe(tap({
      next: () => this.authService.updateCurrentUserUsedSpace(-file.size)
    }));
  }

  constructor() {
    const currentUrl = this.router.url; // e.g. "/disc/home/folder/123"

    if (currentUrl.startsWith('/disc/home')) {
      // home context
      this.mode.set('GetAll');
      const dirId = this.extractFolderId(currentUrl);
      this.goToFolder(dirId);
    } else if (currentUrl.startsWith('/disc/shared-with-me')) {
      // shared-with-me context
      this.mode.set('GetSharedWithMe');
      const dirId = this.extractFolderId(currentUrl);
      this.goToFolder(dirId);
    }
  }

  private extractFolderId(url: string): number | null {
    const match = url.match(/folder\/(\d+)/);
    return match ? +match[1] : null;
  }

  addFileIfNotExists(file: AppFile) {
    if (this.files().find(f => f.id === file.id)) return;
    this.files.update(files => [...files, file]);
  }

  completeUploadFile(fileId: number): void {
    this.files.update(files => files.map(file => file.id === fileId ? { ...file, fileStatus: FileStatus.Completed } : file));
  }

  setFilesMarkedForAction(files: AppFile[], actionType: ActionType) {
    this.actionContext.set({ files: new Set(files), filesIds: new Set(files.map(f => f.id)), type: actionType });
  }

  clearActionContext() {
    this.actionContext.set(null);
  }

  updateFile(file: AppFile, partialUpdate?: Partial<AppFile>) {
    this.files.update(files => files.map(f => f.id === file.id ? { ...f, ...partialUpdate } : f));
  }

  updateFileUploadProgress(uploadProgressInfo: UploadProgressInfo) {
    this.files.update(files => files.map(file => uploadProgressInfo.fileId === file.id ? {
      ...file,
      uploadProgress: uploadProgressInfo.progress!,
      progressStatus: this.mapStatus(uploadProgressInfo.status)
    }
      : file
    ));
  }

  private mapStatus(status: UploadStatus): ProgressStatus {
    switch (status) {
      case UploadStatus.InProgress: return ProgressStatus.Started;
      case UploadStatus.Stopping: return ProgressStatus.Stopping;
      default: return ProgressStatus.Stopped;
    }
  }
}
