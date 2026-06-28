import { inject, Injectable } from '@angular/core';
import { FileUploadService } from './file-upload.service';
import { firstValueFrom } from 'rxjs';

@Injectable()
export class FileUploadDragDropService {
  private readonly uploadService = inject(FileUploadService);

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

  async uploadDraggedFiles(
    event: DragEvent,
    destinationFolderId: number | null,
  ) {
    if (!event.dataTransfer || event.dataTransfer.items.length === 0) return;
    const { directories, files } = await this.getAllFiles(
      event.dataTransfer.items,
    );

    await firstValueFrom(
      this.uploadService.uploadFiles(directories, files, destinationFolderId),
    );
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
      fls: { file: File; path: string }[],
    ) {
      if (entry.isFile) {
        const file: File = await new Promise((resolve) =>
          (entry as FileSystemFileEntry).file(resolve),
        );
        fls.push({ file, path: path + file.name });
      } else if (entry.isDirectory) {
        const dirPath = path + entry.name + '/';
        dirs.push({ path: dirPath });

        const reader = (entry as FileSystemDirectoryEntry).createReader();
        const entries: FileSystemEntry[] = await new Promise((resolve) =>
          reader.readEntries(resolve),
        );

        for (const ent of entries) {
          await traverse(ent, dirPath, dirs, fls);
        }
      }
    }
  }
}
