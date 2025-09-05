import { computed, inject, Injectable, signal } from '@angular/core';
import { FileService } from './file.service';
import { ToastService } from './toast.service';
import { AppFile } from '../models/app-file.model';
import { Breadcrumb } from '../models/breadcrumb.model';
import { MessageSeverity } from '../models/toast-info.model';

interface HoverTarget {
  type: 'directory' | 'breadcrumb' | 'table';
  target: AppFile | Breadcrumb | null;
}

@Injectable({ providedIn: 'root' })
export class FileUploadDragDropService {
  private readonly fileService = inject(FileService);
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
    currentFolderId: number
  ): number {
    if (!target) return currentFolderId;

    if ('isDirectory' in target) {
      return target.isDirectory ? target.id : currentFolderId;
    }

    return target.id; // breadcrumb
  }

  /**
   * Upload dropped files to backend via FileService
   */
  async uploadDraggedFiles(event: DragEvent, destinationFolderId: number) {
    this.clearHover();
    if (!event.dataTransfer || event.dataTransfer.items.length === 0) return;

    const files = await this.getAllFileEntries(event.dataTransfer.items);

    // You might want to show some loading spinner per file
    // For simplicity, we just call fileService.createFile/upload API
    console.log('Uploading files to folder ID:', destinationFolderId, this.filesNb());
    console.log('Files to upload:', files);
    // Array.from(files).forEach(file => {
    //   this.fileService.uploadFile(file, destinationFolderId).subscribe({
    //     next: (uploadedFile: AppFile) => {
    //       // Optimistically add uploaded file to FileService.files signal
    //       this.fileService.files.update(files => [...files, uploadedFile]);
    //       this.toast.show(
    //         'Upload complete',
    //         `File '${file.name}' uploaded successfully`,
    //         MessageSeverity.success
    //       );
    //     },
    //     error: (err) => {
    //       this.toast.show(
    //         'Upload failed',
    //         `Failed to upload '${file.name}'`,
    //         MessageSeverity.error
    //       );
    //     }
    //   });
    // });

    this.clearHover();
  }

  // private getAllFiles(event: DragEvent) {
  //   let dropzone = document.getElementById("dropzone");
  //   let listing = document.getElementById("listing");

  //   function scanFiles(fileEntry: FileSystemEntry, directoryContainer: FileSystemEntry[]) {
  //     const fileName = fileEntry.name;

  //     if (fileEntry.isDirectory && fileEntry instanceof FileSystemDirectoryEntry) {
  //       let directoryReader = fileEntry.createReader();
  //       let directoryContainer: FileSystemEntry[] = [];

  //       directoryReader.readEntries((entries) => {
  //         entries.forEach((entry) => {
  //           scanFiles(entry, directoryContainer);
  //         });
  //       });
  //     }
  //   }

  //   let items = event.dataTransfer!.items;

  //   for (const item of items) {
  //     const entry = item.webkitGetAsEntry();

  //     if (entry) {
  //       const files: {name: string, isDirectory: boolean, entries: FileSystemEntry[]}[] = [];
  //       scanFiles(entry, files);
  //     }
  //   }
  // }


  // Drop handler function to get all files
  private async getAllFileEntries(dataTransferItemList: DataTransferItemList): Promise<File[]> {
    const fileEntries: FileSystemEntry[] = [];
    const queue: FileSystemEntry[] = [];
    for (let i = 0; i < dataTransferItemList.length; i++) {
      const entry = dataTransferItemList[i].webkitGetAsEntry();
      if (entry) {
        queue.push(entry);
      }
    }
    while (queue.length > 0) {
      let entry = queue.shift()!;
      if (entry.isFile) {
        fileEntries.push(entry);
      } else if (entry.isDirectory) {
        queue.push(
          ...(await this.readAllDirectoryEntries((entry as FileSystemDirectoryEntry).createReader()))
        );
      }
    }
    let files: File[] = [];
    for (let i = 0; i < fileEntries.length; i++) {
      const fEntry = fileEntries[i];
      files.push(await this.getFile(fEntry));
    }
    return files;
  }

  // Get all the entries (files or sub-directories) in a directory
  private async readAllDirectoryEntries(directoryReader: any) {
    const entries: FileSystemEntry[] = [];
    let readEntries: any = await this.readEntriesPromise(directoryReader);
    while (readEntries.length > 0) {
      entries.push(...readEntries);
      readEntries = await this.readEntriesPromise(directoryReader);
    }
    return entries;
  }

  // Wrap readEntries in a promise to make working with readEntries easier
  // readEntries will return only some of the entries in a directory
  private async readEntriesPromise(directoryReader: any) {
    return await new Promise((resolve, reject) => {
      directoryReader.readEntries(resolve, reject);
    });
  }

  private async getFile(fileEntry: any): Promise<File> {
    const file: File = await new Promise((resolve, reject) =>
      fileEntry.file(resolve, reject));

    function isInSubfolder(fileEntry: any) {
      let path = fileEntry.fullPath;
      const re = new RegExp('/', 'g');
      return path.match(re).length > 1;
    }

    if (isInSubfolder(fileEntry))
      Object.defineProperty(file, 'webkitRelativePath', {
        value: fileEntry.fullPath
      })
    return file;
  }
}
