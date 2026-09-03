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
  switchMap,
  Observable,
} from 'rxjs';
import { PartialFileInfo } from '../models/partial-file-info.model';
import { ToastService } from './toast.service';
import {
  UploadProgressInfo,
  UploadStatus,
} from '../models/upload-progress-info.model';
import { MessageSeverity } from '../models/toast-info.model';
import { UploadFileInfo } from '../models/upload-file-info.model';
import { AppFile } from '../models/app-file.model';
import { FileService } from './file.service';
import { BaseFile } from '../models/base-file.model';
import { SharedFile } from '../models/shared-file.model';
import { StorageService } from './storage.service';

@Injectable()
export class FileUploadService {
  private readonly numberOfConcurrentFileUploads = 4;
  private readonly numberOfConcurrentChunkUploads = 2;
  private readonly http = inject(HttpClient);
  private readonly storage = inject(StorageService);
  private readonly toast = inject(ToastService);
  private readonly fileService = inject(FileService);

  private readonly uploadingFiles: Record<
    number,
    { sub: any; isStopped: boolean; chunkSubs?: any[] }
  > = {};
  private readonly filesInfo: Record<
    number,
    { partial: PartialFileInfo; file: File }
  > = {};
  public readonly uploadProgresses = signal<Record<number, UploadProgressInfo>>(
    {},
  );

  public readonly activeUploads = computed(() =>
    Object.values(this.uploadProgresses()).filter(
      (p) =>
        p.status === UploadStatus.InProgress ||
        p.status === UploadStatus.Resumed ||
        p.status === UploadStatus.Started,
    ),
  );

  public readonly activeUploadsInCurrentFolder = computed(() =>
    this.activeUploads().filter(
      (pi) => pi.parentId === this.fileService.parentId(),
    ),
  );
  public readonly isUploading = computed(() => this.activeUploads().length > 0);

  uploadFiles(
    directories: {
      path: string;
    }[],
    files: {
      file: File;
      path: string;
    }[],
    destinationFolderId: number | null = null,
  ) {
    const dirMap = new Map<string, number>();
    const directoriesWithFiles = { directories, files };

    return of(directoriesWithFiles).pipe(
      switchMap(({ directories, files }) => {
        let successCount = 0;
        let failCount = 0;

        // Create directories sequentially first
        return from(
          directories.sort((a, b) => a.path.length - b.path.length),
        ).pipe(
          concatMap((dir) =>
            this.ensureDirectoryExists(dir.path, destinationFolderId).pipe(
              tap((directoryFile) => {
                if (
                  destinationFolderId === this.fileService.parentId() &&
                  dir.path.split('/').length === 2
                ) {
                  this.fileService.addFileIfNotExists(directoryFile!);
                }
                dirMap.set(dir.path, directoryFile!.id);
              }),
              catchError((err) => {
                this.toast.show(
                  $localize`Upload error`,
                  $localize`Failed to create folder '${dir.path}'\nUpload cancelled`,
                  MessageSeverity.error,
                );
                return EMPTY;
              }),
            ),
          ),
          toArray(), // Wait until all directories created
          switchMap(() =>
            from(files).pipe(
              mergeMap(({ file, path }) => {
                const filePath = path.substring(
                  0,
                  path.lastIndexOf('/', path.length) + 1,
                );
                const parentId = dirMap.get(filePath) ?? destinationFolderId;

                return this.upload(file, parentId).pipe(
                  tap(() => successCount++),
                  catchError((err) => {
                    failCount++;
                    var errorMessage =
                      err.error[0] ===
                      'File does not exist or you do not have access'
                        ? $localize`Upload was cancelled by directory owner`
                        : '';
                    this.toast.show(
                      $localize`Upload error`,
                      $localize`Failed to upload file '${file.name}'${errorMessage ? `. ${errorMessage}` : ''}`,
                      MessageSeverity.error,
                    );
                    return EMPTY;
                  }),
                );
              }, this.numberOfConcurrentFileUploads),
              finalize(() => {
                const totalFiles = files.length;

                if (successCount > 0) {
                  let successMsg: string;

                  if (failCount > 0) {
                    if (successCount === 1 && failCount === 1) {
                      successMsg = $localize`1 file uploaded successfully, 1 file failed.`;
                    } else if (successCount === 1) {
                      successMsg = $localize`1 file uploaded successfully, ${failCount} files failed.`;
                    } else if (failCount === 1) {
                      successMsg = $localize`${successCount} files uploaded successfully, 1 file failed.`;
                    } else {
                      successMsg = $localize`${successCount} files uploaded successfully, ${failCount} files failed.`;
                    }
                  } else if (successCount === 1) {
                    successMsg = $localize`1 file uploaded successfully.`;
                  } else {
                    successMsg = $localize`${successCount} files uploaded successfully.`;
                  }
                  this.toast.show(
                    $localize`Upload complete`,
                    successMsg,
                    MessageSeverity.success,
                  );
                } else if (failCount > 0) {
                  this.toast.show(
                    $localize`Upload failed`,
                    totalFiles === 1
                      ? $localize`The file failed to upload.`
                      : $localize`All ${totalFiles} files failed to upload.`,
                    MessageSeverity.error,
                  );
                }
              }),
            ),
          ),
        );
      }),
    );
  }

  public upload(file: File, parentId: number | null) {
    return this.startFileUpload(file, parentId).pipe(
      concatMap((appFile) => {
        if (file.size === 0) return EMPTY;
        const partial = appFile.partialFileInfo!;

        // Only update used space for new uploads, and not for "Shared with me" folder
        if (this.fileService.mode() !== 'GetSharedWithMe')
          this.storage.updateCurrentUserUsedSpace(file.size);

        this.filesInfo[partial.fileId] = { partial, file };

        this.updateProgress({
          status: UploadStatus.Started,
          parentId,
          fileId: partial.fileId,
          progress: 0,
        });

        if (parentId === this.fileService.parentId()) {
          this.fileService.addFileIfNotExists(appFile);
        }

        const upload$ = this.sendFile(file, partial, (progress) => {
          progress.parentId = parentId;
          this.updateProgress(progress);
        }).pipe(
          last(),
          concatMap(() => {
            return this.completeFileUpload(partial.fileId);
          }),
          tap(() => {
            this.updateProgress({
              status: UploadStatus.Completed,
              parentId,
              fileId: partial.fileId,
              progress: 1,
            });
            delete this.filesInfo[partial.fileId];
            delete this.uploadingFiles[partial.fileId];
          }),
          catchError((err) => {
            // handle user-initiated stop
            if (err?.message === 'UploadStopped') {
              // do not show failure toast
              return EMPTY;
            }

            this.toast.show(
              $localize`Upload error`,
              $localize`"${file.name}" failed`,
              MessageSeverity.error,
            );
            console.error(err);
            return throwError(() => err);
          }),
        );

        const shared$ = upload$.pipe(
          shareReplay({ bufferSize: 1, refCount: true }),
        );

        // ensure an uploadingFiles entry exists BEFORE we subscribe so pause() can set isStopped immediately
        const existingEntry = this.uploadingFiles[partial.fileId];
        this.uploadingFiles[partial.fileId] = {
          sub: null,
          isStopped: existingEntry?.isStopped ?? false,
          chunkSubs: existingEntry?.chunkSubs ?? [],
        };

        const sub = shared$.subscribe({
          next: () => {
            /* leave empty; tap updates progress */
          },
          error: (e) => console.error('Upload observable error', e),
        });

        this.uploadingFiles[partial.fileId].sub = sub;

        return shared$;
      }),
    );
  }

  public pause(fileId: number) {
    const entry =
      this.uploadingFiles[fileId] ??
      (this.uploadingFiles[fileId] = { sub: null, isStopped: false });
    entry.isStopped = true;

    const prev = this.uploadProgresses()[fileId];
    const progress = {
      status: UploadStatus.Stopping,
      parentId: prev?.parentId ?? null,
      fileId,
      progress: prev?.progress ?? null,
    };
    this.updateProgress(progress);
    //Rest is handled by main upload pipeline
    //In sendFileChunks, when isStopped is detected, no new chunks are started
  }

  public cancel(fileId: number) {
    const uploadInfo = this.uploadingFiles[fileId];
    if (uploadInfo) {
      // unsubscribe main upload subscription
      uploadInfo.sub?.unsubscribe();
      // abort any in-flight chunk HTTP requests
      if (uploadInfo.chunkSubs?.length) {
        uploadInfo.chunkSubs.forEach((s) => {
          try {
            s.unsubscribe();
          } catch {
            /* ignore */
          }
        });
      }
      delete this.uploadingFiles[fileId];
      this.removeProgress(fileId);
    }
  }

  private selectUserFile(): Promise<File> {
    return new Promise<File>((resolve, reject) => {
      const input = document.createElement('input');
      input.type = 'file';
      input.style.display = 'none';

      input.onchange = () => {
        if (!input.files || input.files.length === 0) {
          this.toast.show(
            $localize`Cancellation`,
            $localize`No file selected for resuming upload`,
            MessageSeverity.info,
          );
          return;
        }
        resolve(input.files[0]);
        document.body.removeChild(input);
      };

      input.oncancel = () => {
        this.toast.show(
          $localize`Cancellation`,
          $localize`File selection cancelled`,
          MessageSeverity.info,
        );
        document.body.removeChild(input);
      };

      document.body.appendChild(input);
      input.click();
    });
  }

  public async resume(file: BaseFile, parentId: number | null = null) {
    const fileId = file.id;
    let fileInfo = this.filesInfo[fileId];
    if (!fileInfo) {
      try {
        const selectedFile = await this.selectUserFile();

        fileInfo = {
          partial: file.partialFileInfo!,
          file: selectedFile,
        };

        if (
          file.fileName !== fileInfo.file.name ||
          file.size !== fileInfo.file.size ||
          file.mimeType !== fileInfo.file.type
        ) {
          this.toast.show(
            $localize`File mismatch`,
            $localize`The selected file does not match the original file for resuming upload.`,
            MessageSeverity.error,
          );
          return;
        }

        this.filesInfo[fileId] = fileInfo;
      } catch (err) {
        this.toast.show(
          $localize`Cancellation`,
          $localize`File selection cancelled`,
          MessageSeverity.info,
        );
        return;
      }
    }

    this.filesInfo[fileId] = fileInfo;
    this.getMissingChunks(fileId)
      .pipe(
        concatMap((missing) => {
          this.updateProgress({
            status: UploadStatus.Resumed,
            parentId,
            fileId,
            progress: file.uploadProgress,
          });

          const chunks = new Map<number, number[]>();
          missing.forEach((x) => {
            const start = fileInfo.partial.chunkSize * x;
            const end =
              start +
              (x === fileInfo.partial.numberOfChunks - 1
                ? fileInfo.partial.lastChunkSize
                : fileInfo.partial.chunkSize);
            chunks.set(x, [start, end, 0]);
          });

          const upload$ = this.sendFileChunks(
            fileInfo.file,
            chunks,
            fileInfo.partial,
            (progress) => {
              progress.parentId = parentId;
              this.updateProgress(progress);
            },
          ).pipe(
            last(),
            concatMap(() => this.completeFileUpload(fileInfo.partial.fileId)),
            tap(() => {
              this.updateProgress({
                status: UploadStatus.Completed,
                parentId,
                fileId,
                progress: 1,
              });
              delete this.filesInfo[fileId];
              delete this.uploadingFiles[fileId];
            }),
            catchError((err) => {
              // handle stop
              if (err?.message === 'UploadStopped') {
                return EMPTY;
              }

              this.toast.show(
                $localize`Upload error`,
                $localize`"${fileInfo.file.name}" failed during resume`,
                MessageSeverity.error,
              );
              console.error(err);
              return throwError(() => err);
            }),
          );

          const shared$ = upload$.pipe(
            shareReplay({ bufferSize: 1, refCount: true }),
          );
          // create entry before subscribing
          // ensure isStopped is cleared so resume works
          const existingResumeEntry = this.uploadingFiles[fileId];
          this.uploadingFiles[fileId] = {
            sub: null,
            isStopped: false,
            chunkSubs: existingResumeEntry?.chunkSubs ?? [],
          };

          const sub = shared$.subscribe({
            next: () => {},
            error: (e) => console.error('Resume upload error', e),
          });

          this.uploadingFiles[fileId].sub = sub;
          return of(null);
        }),
      )
      .subscribe();
  }

  private updateProgress(p: UploadProgressInfo) {
    this.uploadProgresses.update((prev) => ({
      ...prev,
      [p.fileId as number]: p,
    }));
    this.fileService.updateFileUploadProgress(p);
  }

  private removeProgress(fileId: number) {
    this.uploadProgresses.update((prev) => {
      const { [fileId]: _, ...rest } = prev;
      return rest;
    });
  }

  // ---------------- internal helpers ----------------

  private getMissingChunks(fileId: number) {
    return this.http.get<number[]>(
      `${environment.apiUrl}/Upload/${fileId}/MissingChunks`,
    );
  }

  private startFileUpload(file: File, parentId: number | null) {
    const data: UploadFileInfo = {
      fileName: file.name,
      size: file.size,
      lastModificationDate: new Date(file.lastModified),
      mimeType: file.type,
      parentId,
    };
    return this.http.post<AppFile | SharedFile>(
      `${environment.apiUrl}/Upload/Start`,
      data,
    );
  }

  private completeFileUpload(fileId: number) {
    return this.http
      .put(`${environment.apiUrl}/Upload/${fileId}/Complete`, {})
      .pipe(
        tap({
          next: () => this.fileService.completeUploadFile(fileId),
        }),
      );
  }

  private sendFileChunks(
    file: File,
    chunks: Map<number, number[]>,
    partial: PartialFileInfo,
    onProgress: (p: UploadProgressInfo) => void,
  ) {
    const activeChunks = new Set<number>();

    const update = (event: HttpEvent<any>, idx: number) => {
      switch (event.type) {
        case HttpEventType.UploadProgress:
          const percentDone = event.loaded / (event.total ?? 1);
          chunks.get(idx)![2] = percentDone;
          break;
        case HttpEventType.Response:
          chunks.get(idx)![2] = 1;
          activeChunks.delete(idx);
          break;
      }

      const numberOfAlreadyUploadedChunks =
        partial.numberOfChunks - chunks.size;
      const progress =
        ([...chunks.values()].reduce((a, b) => a + b[2], 0) +
          numberOfAlreadyUploadedChunks) /
        partial.numberOfChunks;

      const uploadEntry = this.uploadingFiles[partial.fileId];
      let status: UploadStatus;

      if (uploadEntry?.isStopped) {
        status =
          activeChunks.size === 0
            ? UploadStatus.Stopped
            : UploadStatus.Stopping;
      } else {
        status = UploadStatus.InProgress;
      }

      onProgress({ status, fileId: partial.fileId, progress });
    };

    const entries = Array.from(chunks.entries());
    const chunks$ = from(entries).pipe(
      mergeMap(([index, [start, end]]) => {
        const detached$ = new Observable<HttpEvent<any>>((observer) => {
          const uploadEntry = this.uploadingFiles[partial.fileId];
          if (uploadEntry?.isStopped) {
            observer.complete();
            return () => {};
          }

          const chunk = file.slice(start, end);
          activeChunks.add(index);
          const inner$ = this.sendChunk(chunk, partial.fileId, index).pipe(
            tap((e) => update(e, index)),
            retry(4),
          );
          const innerSub = inner$.subscribe({
            next: (v) => observer.next(v),
            error: (err) => observer.error(err),
            complete: () => observer.complete(),
          });

          const uploadInfo = this.uploadingFiles[partial.fileId];
          if (uploadInfo) {
            uploadInfo.chunkSubs = uploadInfo.chunkSubs ?? [];
            uploadInfo.chunkSubs.push(innerSub);
          }

          // when innerSub ends, remove it from chunkSubs
          const cleanup = () => {
            const uploadInfo = this.uploadingFiles[partial.fileId];
            if (uploadInfo?.chunkSubs) {
              uploadInfo.chunkSubs = uploadInfo.chunkSubs.filter(
                (s) => s !== innerSub,
              );
            }
            activeChunks.delete(index);
          };
          innerSub.add(cleanup);

          // Dont unsubscribe innerSub when outer unsubscribes
          // this (keeps in-flight HTTP running)
          return () => {
            /* only outer subscription teardown */
          };
        });

        return detached$;
      }, this.numberOfConcurrentChunkUploads),
    );

    return chunks$.pipe(
      switchMap(() => {
        const uploadInfo = this.uploadingFiles[partial.fileId];
        if (uploadInfo?.isStopped) {
          return throwError(() => new Error('UploadStopped'));
        }
        return of(null);
      }),
    );
  }

  private sendFile(
    file: File,
    partial: PartialFileInfo,
    onProgress: (p: UploadProgressInfo) => void,
  ) {
    const chunks = new Map<number, number[]>();
    for (let i = 0; i < partial.numberOfChunks; i++) {
      const start = partial.chunkSize * i;
      const end =
        start +
        (i === partial.numberOfChunks - 1
          ? partial.lastChunkSize
          : partial.chunkSize);
      chunks.set(i, [start, end, 0]);
    }
    return this.sendFileChunks(file, chunks, partial, onProgress);
  }

  private sendChunk(chunk: Blob, fileId: number, index: number) {
    const form = new FormData();
    form.append('chunk', chunk);
    return this.http.put(
      `${environment.apiUrl}/Upload/${fileId}/Chunk/${index}`,
      form,
      {
        reportProgress: true,
        observe: 'events',
      },
    );
  }

  public ensureDirectoryExists(path: string, parentId: number | null) {
    if (path.startsWith('/')) path = path.slice(1);
    const folders = path.split('/').slice(0, -1);
    if (folders.length === 0) return of(null);
    return this.http.post<AppFile | SharedFile | null>(
      `${environment.apiUrl}/Upload/EnsureDirectory`,
      { parentId, folders },
    );
  }
}
