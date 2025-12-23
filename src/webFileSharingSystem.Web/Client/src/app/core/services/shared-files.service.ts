// import { httpResource } from '@angular/common/http';
// import {
//   computed,
//   inject,
//   Injectable,
//   linkedSignal,
//   signal,
// } from '@angular/core';
// import { Router } from '@angular/router';
// import { environment } from '../../../environments/environment';
// import { ActionType } from '../models/action-type.model';
// import { ProgressStatus } from '../models/app-file.model';
// import { Breadcrumb } from '../models/breadcrumb.model';
// import { debouncedSignal } from '../utils/signal-utils';
// import { ToastService } from './toast.service';
// import { SharedFile } from '../models/shared-file.model';
// import { MessageSeverity } from '../models/toast-info.model';
// import { FileApiService } from './api/file-api.service';
// import { FileResponse } from '../models/file-response.model';

// @Injectable({
//   providedIn: 'root',
// })
// export class SharedFilesService {
//   private readonly filesUrl = `${environment.apiUrl}/File`;
//   private readonly router = inject(Router);
//   private readonly fileApiService = inject(FileApiService);
//   private readonly toast = inject(ToastService);
//   private readonly actionContext = linkedSignal<
//     Record<number, SharedFile>,
//     { files: Set<SharedFile>; filesIds: Set<number>; type: ActionType } | null
//   >({
//     source: () =>
//       Object.fromEntries(this.files().map((item) => [item.id, item])) as Record<
//         string,
//         SharedFile
//       >,
//     computation: (source, previous) => {
//       if (!previous || !previous.value?.files) return null;
//       const resultFiles = [...previous.value.files].map(
//         (f) => source[f.id] ?? f
//       );

//       //Return updated files set
//       return {
//         files: new Set(resultFiles),
//         filesIds: previous.value.filesIds,
//         type: previous.value.type,
//       };
//     },
//   });
//   readonly waitingForAction = this.actionContext.asReadonly();

//   public readonly searchedPhrase = signal<string>('');
//   public readonly parentId = signal<number | null>(null);
//   public readonly parentName = computed(() =>
//     this.breadCrumbsResource.hasValue()
//       ? this.breadCrumbsResource.value().find((b) => b.id === this.parentId())
//           ?.fileName
//       : ''
//   );

//   public readonly currentPage = signal<number>(1);
//   public readonly itemsPerPage = signal<number>(9999);
//   public readonly files = linkedSignal<SharedFile[]>(
//     () =>
//       this._linkedFilesResponse()
//         ?.items.map((file) => ({
//           ...file,
//           progressStatus: ProgressStatus.Stopped,
//         }))
//         .sort((a, b) => a.fileName.localeCompare(b.fileName)) ?? []
//   );

//   // UI state shared across components
//   public readonly editingId = signal<number | null>(null);
//   public readonly loadingIds = signal<Set<number>>(new Set());
//   public readonly pagainationData = computed(() =>
//     this._linkedFilesResponse()
//       ? {
//           currentPage: this.currentPage(),
//           itemsPerPage: this.itemsPerPage(),
//           totalItems: this._linkedFilesResponse()!.totalCount,
//           totalPages: this._linkedFilesResponse()!.totalPages,
//         }
//       : null
//   );

//   private readonly _debouncedSearchedPhrase = debouncedSignal(
//     this.searchedPhrase,
//     300,
//     ''
//   );


//   private readonly _request = computed(
//     () => `${
//       this.filesUrl
//     }/GetSharedWithMe?PageNumber=${this.currentPage()}&PageSize=${this.itemsPerPage()}
//       ${this.parentId() ? '&ParentId=' + this.parentId() : ''}${
//       this._debouncedSearchedPhrase() !== ''
//         ? '&SearchedPhrase=' + this._debouncedSearchedPhrase()
//         : ''
//     }`
//   );
//   readonly _fileResource = httpResource<FileResponse<SharedFile>>(() =>
//     this._request()
//   );

//   private readonly _linkedFilesResponse = linkedSignal<
//     FileResponse<SharedFile> | undefined,
//     FileResponse<SharedFile> | undefined
//   >({
//     source: () => this._fileResource.value(),
//     computation: (source, previous) => {
//       if (source === undefined && previous?.value !== undefined) {
//         return previous?.value;
//       }
//       return source;
//     },
//   });
//   public readonly fileResource = this._fileResource.asReadonly();

//   //breadcumbs
//   private readonly _breadcrumbsQuery = computed(() =>
//     this.parentId() !== null
//       ? `${this.filesUrl}/GetFilePath/${this.parentId()}`
//       : undefined
//   );
//   private readonly _breadCrumbsResource = httpResource<Breadcrumb[]>(() =>
//     this._breadcrumbsQuery()
//   );
//   public readonly breadCrumbsResource = this._breadCrumbsResource.asReadonly();

//   constructor() {
//     const currentUrl = this.router.url; // e.g. "/disc/home/folder/123"

//     if (currentUrl.startsWith('/disc/shared-with-me')) {
//       const dirId = this.extractFolderId(currentUrl);
//       this.goToFolder(dirId);
//     }
//   }

//   goToFolder(folderId: number | null) {
//     this.parentId.set(folderId);

//     if (folderId === null) this.router.navigate(['/disc', 'shared-with-me']);
//     else this.router.navigate(['/disc', 'shared-with-me', 'folder', folderId]);
//   }

//   private extractFolderId(url: string): number | null {
//     const match = url.match(/folder\/(\d+)/);
//     return match ? +match[1] : null;
//   }

//   // Shared UI helpers
//   renameFileWithFeedback(file: SharedFile, newFileName: string) {
//     newFileName = newFileName.trim();

//     if (newFileName === '') {
//       this.toast.show(
//         'File rename',
//         'File name cannot be empty',
//         MessageSeverity.error
//       );
//       return;
//     }

//     if (newFileName === file.fileName) {
//       this.editingId.set(null);
//       return;
//     }

//     if (this.files().some((f) => f.fileName === newFileName)) {
//       this.toast.show(
//         'File rename',
//         'File with this name already exists',
//         MessageSeverity.error
//       );
//       return;
//     }

//     this.setLoading(file.id, true);
//     this.editingId.set(null);

//     this.fileApiService
//       .renameFile(file.id, newFileName)
//       .subscribe({
//         next: () => {
//           this.toast.show(
//             'File rename',
//             'File renamed successfully',
//             MessageSeverity.success
//           );
//           this.updateFile(file, { fileName: newFileName });
//         },
//         error: (err) => {
//           this.toast.show(
//             'File rename',
//             err.error || String(err),
//             MessageSeverity.error
//           );
//         },
//       })
//       .add(() => this.setLoading(file.id, false));
//   }

//   setLoading(id: number, value: boolean) {
//     this.loadingIds.update((prev) => {
//       const next = new Set(prev);
//       if (value) next.add(id);
//       else next.delete(id);
//       return next;
//     });
//   }

//   updateFile(file: SharedFile, partialUpdate?: Partial<SharedFile>) {
//     this.files.update((files) =>
//       files.map((f) => (f.id === file.id ? { ...f, ...partialUpdate } : f))
//     );
//   }
// }
