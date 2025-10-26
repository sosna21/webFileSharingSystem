import { HttpClient, HttpEvent, HttpEventType } from '@angular/common/http';
import { Injectable, computed, inject, signal } from '@angular/core';
import { environment } from '../../../environments/environment';
import {
  from,
  concatMap,
  retry,
  tap,
  catchError,
  throwError,
  finalize,
  of,
  EMPTY,
  shareReplay,
  last,
  mergeMap,
  toArray,
  switchMap
} from 'rxjs';
import { PartialFileInfo } from '../models/partial-file-info.model';
import { AuthenticationService } from './authentication.service';
import { ToastService } from './toast.service';
import { UploadProgressInfo, UploadStatus } from '../models/upload-progress-info.model';
import { MessageSeverity } from '../models/toast-info.model';
import { UploadFileInfo } from '../models/upload-file-info.model';
import { AppFile } from '../models/app-file.model';
import { FileService } from './file.service';

@Injectable({ providedIn: 'root' })
export class FileUploadService {
  private readonly numberOfConcurrentFileUploads = 4;
  private readonly numberOfConcurrentChunkUploads = 5;
  private readonly http = inject(HttpClient);
  private readonly auth = inject(AuthenticationService);
  private readonly toast = inject(ToastService);
  private readonly fileService = inject(FileService);

  private readonly uploadingFiles: Record<number, { sub: any; isStopped: boolean }> = {};
  private readonly filesInfo: Record<number, { partial: PartialFileInfo; file: File }> = {};
  public readonly uploadProgresses = signal<Record<number, UploadProgressInfo>>({});

  public readonly activeUploads = computed(() =>
    Object.values(this.uploadProgresses()).filter(p =>
      p.status === UploadStatus.InProgress ||
      p.status === UploadStatus.Resumed ||
      p.status === UploadStatus.Started
    )
  );

  public readonly activeUploadsInCurrentFolder = computed(() => this.activeUploads().filter(pi => pi.parentId === this.fileService.parentId()));
  public readonly isUploading = computed(() => this.activeUploads().length > 0);


  uploadFiles(
    directories: {
      path: string;
    }[],
    files: {
      file: File;
      path: string;
    }[],
    destinationFolderId: number | null = null
  ) {
    const dirMap = new Map<string, number>();
    const directoriesWithFiles = { directories, files };

    return of(directoriesWithFiles).pipe(
      switchMap(({ directories, files }) => {
        let successCount = 0;
        let failCount = 0;

        // Create directories sequentially first
        return from(directories.sort((a, b) => a.path.length - b.path.length)).pipe(
          concatMap(dir =>
            this.ensureDirectoryExists(dir.path, destinationFolderId).pipe(
              tap(directoryFile => {
                if (
                  destinationFolderId === this.fileService.parentId() &&
                  dir.path.split('/').length === 2
                ) {
                  this.fileService.addFileIfNotExists(directoryFile!);
                }
                dirMap.set(dir.path, directoryFile!.id);
              }),
              catchError(err => {
                this.toast.show(
                  'Upload error',
                  `Failed to create folder '${dir.path}'\nUpload cancelled`,
                  MessageSeverity.error
                );
                return EMPTY;
              })
            )
          ),
          toArray(), // Wait until all directories created
          switchMap(() => from(files).pipe(
            mergeMap(({ file, path }) => {
              const filePath = path.substring(0, path.lastIndexOf('/', path.length) + 1);
              const parentId = dirMap.get(filePath) ?? destinationFolderId;

              return this.upload(file, parentId).pipe(
                tap(() => successCount++),
                catchError(err => {
                  failCount++;
                  this.toast.show(
                    'Upload error',
                    `Failed to upload file '${file.name}'`,
                    MessageSeverity.error
                  );
                  return EMPTY;
                })
              );
            }, this.numberOfConcurrentFileUploads),
            finalize(() => {
              const totalFiles = files.length;

              if (successCount > 0) {
                const successMsg =
                  failCount > 0
                    ? `${successCount} file(s) uploaded successfully, ${failCount} failed.`
                    : `${successCount} file(s) uploaded successfully.`;

                this.toast.show(
                  'Upload complete',
                  successMsg,
                  failCount > 0 ? MessageSeverity.info : MessageSeverity.success
                );
              } else {
                this.toast.show(
                  'Upload failed',
                  `All ${totalFiles} file(s) failed to upload.`,
                  MessageSeverity.error
                );
              }
            })
          ))
        );
      })
    );
  }


  public upload(file: File, parentId: number | null) {
    return this.startFileUpload(file, parentId).pipe(
      concatMap(appFile => {
        if (file.size === 0) return EMPTY;
        const partial = appFile.partialFileInfo!;

        this.auth.updateCurrentUserUsedSpace(file.size);
        this.filesInfo[partial.fileId] = { partial, file };

        this.updateProgress({
          status: UploadStatus.Started,
          parentId,
          fileId: partial.fileId,
          progress: 0
        });

        if (parentId === this.fileService.parentId()) {
          this.fileService.files.update(prev => [appFile, ...prev]);
        }

        // the core upload pipeline for this file
        const upload$ = this.sendFile(file, partial, progress => {
          progress.parentId = parentId;
          this.updateProgress(progress);
        }).pipe(
          // WAIT until the *entire* sendFile stream completes (all chunks done)
          last(),
          concatMap(() => {
            return this.completeFileUpload(partial.fileId);
          }),
          tap(() => {
            this.updateProgress({
              status: UploadStatus.Completed,
              parentId,
              fileId: partial.fileId,
              progress: 1
            });
            delete this.filesInfo[partial.fileId];
            // cleanup of uploadingFiles happens when we unsubscribe below
            delete this.uploadingFiles[partial.fileId];
          }),
          catchError(err => {
            this.toast.show(
              'Upload error',
              `"${file.name}" failed`,
              MessageSeverity.error
            );
            console.error(err);
            return throwError(() => err);
          })
        );

        const shared$ = upload$.pipe(
          // buffer the result while there are subscribers
          // shareReplay with refCount ensures single execution
          shareReplay({ bufferSize: 1, refCount: true })
        );

        const sub = shared$.subscribe({
          next: () => { /* leave emmpty; tap updates progress */ },
          error: (e) => console.error('Upload observable error', e)
        });

        // keep a handle for pause/cancel
        this.uploadingFiles[partial.fileId] = { sub, isStopped: false };

        return shared$;
      })
    );
  }

  public pause(fileId: number) {
    const u = this.uploadingFiles[fileId];
    if (u) u.isStopped = true;
  }

  public cancel(fileId: number) {
    const u = this.uploadingFiles[fileId];
    if (u) {
      u.sub.unsubscribe();
      delete this.uploadingFiles[fileId];
      this.removeProgress(fileId);
    }
  }

  public resume(fileId: number, fileInfo: { partial: PartialFileInfo; file: File }, parentId: number | null = null) {
    this.filesInfo[fileId] = fileInfo;
    this.getMissingChunks(fileId).pipe(
      concatMap(missing => {
        this.updateProgress({
          status: UploadStatus.Resumed,
          parentId,
          fileId,
          progress: 0
        });

        const chunks = new Map<number, number[]>();
        missing.forEach(x => {
          const start = fileInfo.partial.chunkSize * x;
          const end = start + (x === fileInfo.partial.numberOfChunks - 1 ? fileInfo.partial.lastChunkSize : fileInfo.partial.chunkSize);
          chunks.set(x, [start, end, 0]);
        });

        const upload$ = this.sendFileChunks(fileInfo.file, chunks, fileInfo.partial, progress => {
          progress.parentId = parentId;
          this.updateProgress(progress);
        }).pipe(
          last(),
          concatMap(() => this.completeFileUpload(fileInfo.partial.fileId)),
          tap(() => {
            this.updateProgress({
              status: UploadStatus.Completed,
              parentId,
              fileId,
              progress: 1
            });
            delete this.filesInfo[fileId];
            delete this.uploadingFiles[fileId];
          }),
          catchError(err => {
            this.toast.show('Upload error', `"${fileInfo.file.name}" failed during resume`, MessageSeverity.error);
            console.error(err);
            return throwError(() => err);
          })
        );

        const shared$ = upload$.pipe(shareReplay({ bufferSize: 1, refCount: true }));
        const sub = shared$.subscribe({
          next: () => { },
          error: (e) => console.error('Resume upload error', e)
        });

        this.uploadingFiles[fileId] = { sub, isStopped: false };
        return of(null);
      })
    ).subscribe();
  }

  private updateProgress(p: UploadProgressInfo) {
    this.uploadProgresses.update(prev => ({ ...prev, [p.fileId as number]: p }));
  }

  private removeProgress(fileId: number) {
    this.uploadProgresses.update(prev => {
      const { [fileId]: _, ...rest } = prev;
      return rest;
    });
  }

  // ---------------- internal helpers ----------------

  private getMissingChunks(fileId: number) {
    return this.http.get<number[]>(`${environment.apiUrl}/Upload/${fileId}/MissingChunks`);
  }

  private startFileUpload(file: File, parentId: number | null) {
    const data: UploadFileInfo = {
      fileName: file.name,
      size: file.size,
      lastModificationDate: new Date(file.lastModified),
      mimeType: file.type,
      parentId
    };
    return this.http.post<AppFile>(`${environment.apiUrl}/Upload/Start`, data);
  }

  private completeFileUpload(fileId: number) {
    return this.http.put(`${environment.apiUrl}/Upload/${fileId}/Complete`, {})
      .pipe(tap({
        next: () => this.fileService.completeUploadFile(fileId)
      }));
  }

  private sendFileChunks(
    file: File,
    chunks: Map<number, number[]>,
    partial: PartialFileInfo,
    onProgress: (p: UploadProgressInfo) => void
  ) {
    const update = (event: HttpEvent<any>, idx: number) => {
      switch (event.type) {
        case HttpEventType.UploadProgress:
          chunks.get(idx)![2] = event.loaded / (event.total ?? 1);
          break;
        case HttpEventType.Response:
          chunks.get(idx)![2] = 1;
          break;
      }
      const progress = [...chunks.values()].reduce((a, b) => a + b[2], 0) / partial.numberOfChunks;
      const status = this.uploadingFiles[partial.fileId]?.isStopped
        ? UploadStatus.Stopping
        : UploadStatus.InProgress;
      onProgress({ status, fileId: partial.fileId, progress });
    };

    return from(Array.from(chunks.entries())).pipe(
      mergeMap(([index, [start, end]]) => {
        const chunk = file.slice(start, end);
        return this.sendChunk(chunk, partial.fileId, index).pipe(
          tap(e => update(e, index)),
          retry(4),
          catchError(err => {
            return throwError(() => err);
          })
        );
      }, this.numberOfConcurrentChunkUploads),
      finalize(() => {
        const u = this.uploadingFiles[partial.fileId];
        if (u?.isStopped) {
          try { u.sub?.unsubscribe(); } catch { /* ignore */ }
          u.isStopped = false;
          onProgress({ status: UploadStatus.Stopped, fileId: partial.fileId, progress: null });
        }
      })
    );
  }

  private sendFile(file: File, partial: PartialFileInfo, onProgress: (p: UploadProgressInfo) => void) {
    const chunks = new Map<number, number[]>();
    for (let i = 0; i < partial.numberOfChunks; i++) {
      const start = partial.chunkSize * i;
      const end = start + (i === partial.numberOfChunks - 1 ? partial.lastChunkSize : partial.chunkSize);
      chunks.set(i, [start, end, 0]);
    }
    return this.sendFileChunks(file, chunks, partial, onProgress);
  }

  private sendChunk(chunk: Blob, fileId: number, index: number) {
    const form = new FormData();
    form.append('chunk', chunk);
    return this.http.put(`${environment.apiUrl}/Upload/${fileId}/Chunk/${index}`, form, {
      reportProgress: true,
      observe: 'events'
    });
  }

  public ensureDirectoryExists(path: string, parentId: number | null) {
    if (path.startsWith('/')) path = path.slice(1);
    const folders = path.split('/').slice(0, -1);
    if (folders.length === 0) return of(null);
    return this.http.post<AppFile | null>(`${environment.apiUrl}/Upload/EnsureDirectory`, { parentId, folders });
  }
}
