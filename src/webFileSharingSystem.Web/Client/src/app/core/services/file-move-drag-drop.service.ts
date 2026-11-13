import { inject, Injectable, signal } from '@angular/core';
import { BaseFile } from '../models/base-file.model';
import { FileOperationsService } from './file-operations.service';

@Injectable()
export class FileMoveDragDropService {
  readonly draggedFiles = signal<BaseFile[]>([]);
  readonly fileOperations = inject(FileOperationsService);

  startDrag(files: BaseFile[]) {
    this.draggedFiles.set(files);
  }

  clearDragState() {
    this.draggedFiles.set([]);
  }

  /**
   * Check if DataTransfer contains app files
   */
  allowAppFiles(event: DragEvent): boolean {
    return this.draggedFiles().length > 0 && event.dataTransfer !== null;
  }

  /**
   * Set drop effect according to allowed files
   */
  setDropEffect(event: DragEvent, allowed: boolean): void {
    if (!event.dataTransfer) return;
    event.dataTransfer.dropEffect = allowed ? 'move' : 'none';
  }

  async moveDraggedFiles(destinationId: number, destinationName: string) {
    this.fileOperations.moveFilesWithFeedback(
      this.draggedFiles(),
      destinationId,
      destinationName,
    );
  }
}
