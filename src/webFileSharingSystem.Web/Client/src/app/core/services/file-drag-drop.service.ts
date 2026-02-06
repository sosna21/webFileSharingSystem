import { inject, Injectable, signal } from '@angular/core';
import { BaseFile } from '../models/base-file.model';
import { FileService } from './file.service';

@Injectable({
  providedIn: 'root',
})
export class FileDragDropService {
  readonly draggedFiles = signal<BaseFile[]>([]);
  readonly fileService = inject(FileService);

  startDrag(files: BaseFile[]) {
    this.draggedFiles.set(files);
  }

  clearDragedFiles() {
    this.draggedFiles.set([]);
  }

  /**
   * Check if DataTransfer contains app files
   */
  allowAppFiles(event: DragEvent): boolean {
    return event.dataTransfer?.types.includes('application/json') ?? false;
  }

  /**
   * Set drop effect according to allowed files
   */
  setDropEffect(event: DragEvent, allowed: boolean): void {
    if (!event.dataTransfer) return;
    event.dataTransfer.dropEffect = allowed ? 'move' : 'none';
  }

  async moveDraggedFiles(
    event: DragEvent,
    destinationId: number,
    destinationName: string,
  ) {
    this.fileService.moveFilesWithFeedback(
      this.draggedFiles(),
      destinationId,
      destinationName,
    );
  }
}
