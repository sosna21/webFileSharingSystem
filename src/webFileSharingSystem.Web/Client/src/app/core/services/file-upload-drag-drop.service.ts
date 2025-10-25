import { computed, inject, Injectable, signal } from '@angular/core';
import { FileService } from './file.service';
import { ToastService } from './toast.service';
import { AppFile } from '../models/app-file.model';
import { Breadcrumb } from '../models/breadcrumb.model';
import { MessageSeverity } from '../models/toast-info.model';
import { FileUploadService } from './file-upload.service';
import { catchError, concatMap, EMPTY, finalize, from, mergeMap, switchMap, tap, toArray } from 'rxjs';

interface HoverTarget {
  type: 'directory' | 'breadcrumb' | 'table';
  target: AppFile | Breadcrumb | null;
}

@Injectable({ providedIn: 'root' })
export class FileUploadDragDropService {
  private readonly numberOfConcurrentFileUploads = 5;
  private readonly fileService = inject(FileService);
  private readonly uploadService = inject(FileUploadService);
  private readonly toast = inject(ToastService);

  /** Currently hovered target for upload highlight */
  readonly hoveredTarget = signal<HoverTarget | null>(null);
  readonly filesNb = signal<number>(0);
  //
  readonly uploadTarget = computed<{ id: number | null, name: string } | null>(() => {
    const target = this.hoveredTarget();
    if (!target) return null;

    if (target.type === 'directory' && target.target && (target.target as AppFile).isDirectory) {
      return { id: target.target.id, name: target.target.fileName };
    }

    if (target.type === 'breadcrumb' && target.target) {
      return { id: target.target.id, name: target.target.fileName };
    }

    return { id: this.fileService.parentId(), name: this.fileService.parentName() ?? 'Home' };
  });

  /** Check if the drag event contains external OS files */
  allowExternalFiles(event: DragEvent): boolean {
    return event.dataTransfer?.types.includes('Files') ?? false;
  }

  /** Extract dropped files from event */
  getDroppedFiles(event: DragEvent): File[] {
    return Array.from(event.dataTransfer?.files ?? []);
  }

  getFileCount(event: DragEvent): number {
    const dt = event.dataTransfer;
    return dt?.items?.length ?? dt?.files?.length ?? 0;
  }

  /** Mark hovered target for visual feedback */
  setHoverTarget(hoverTarget?: HoverTarget, event?: DragEvent) {
    if (event) {
      const fileCount = this.getFileCount(event);
      this.filesNb.set(fileCount);
    }
    this.hoveredTarget.set(hoverTarget ?? null);
  }

  /** Clear hover state */
  clearHover() {
    this.hoveredTarget.set(null);
    this.filesNb.set(0);
  }

  /**
   * Resolve destination folder ID
   * - Drop on directory → that directory
   * - Drop on file → current folder
   * - Drop on breadcrumb → breadcrumb folder
   */
  getDestinationFolder(
    target: AppFile | Breadcrumb | null,
    currentFolderId: number | null
  ): number | null {
    if (!target) return currentFolderId;

    if ('isDirectory' in target) {
      return target.isDirectory ? target.id : currentFolderId;
    }

    return target.id; // breadcrumb
  }

  async uploadDraggedFiles(event: DragEvent, destinationFolderId: number | null) {
    const dirMap = new Map<string, number>();
    if (!event.dataTransfer || event.dataTransfer.items.length === 0) return;
    this.clearHover();

    from(this.getAllFiles(event.dataTransfer.items)).pipe(
      switchMap(({ directories, files }) => {
        let successCount = 0;
        let failCount = 0;

        // Create directories sequentially first
        return from(directories.sort((a, b) => a.path.length - b.path.length)).pipe(
          concatMap(dir =>
            this.uploadService.ensureDirectoryExists(dir.path, destinationFolderId).pipe(
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

              return this.uploadService.upload(file, parentId).pipe(
                tap(() => successCount++),
                catchError(err => {
                  console.log('Upload error for file', file.name, err);
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
    ).subscribe();
  }


  async getAllFiles(items: DataTransferItemList): Promise<{
    directories: { path: string }[];
    files: { file: File; path: string }[];
  }> {
    const directories: { path: string }[] = [];
    const files: { file: File; path: string }[] = [];

    if (!items) return { directories, files };

    // Capture entries synchronously (needed for Chrome compatibility)
    const entries: FileSystemEntry[] = [];
    for (const item of items) {
      const entry = item.webkitGetAsEntry();
      if (entry) entries.push(entry);
    }

    for (const entry of entries) {
      await traverse(entry, '', directories, files);
    }

    return { directories, files };

    async function traverse(
      entry: FileSystemEntry,
      path: string,
      dirs: { path: string }[],
      fls: { file: File; path: string }[]
    ) {
      if (entry.isFile) {
        const file: File = await new Promise((resolve) =>
          (entry as FileSystemFileEntry).file(resolve)
        );
        fls.push({ file, path: path + file.name });
      } else if (entry.isDirectory) {
        const dirPath = path + entry.name + '/';
        dirs.push({ path: dirPath });

        const reader = (entry as FileSystemDirectoryEntry).createReader();
        const entries: FileSystemEntry[] = await new Promise((resolve) =>
          reader.readEntries(resolve)
        );

        for (const ent of entries) {
          await traverse(ent, dirPath, dirs, fls);
        }
      }
    }
  }
}
