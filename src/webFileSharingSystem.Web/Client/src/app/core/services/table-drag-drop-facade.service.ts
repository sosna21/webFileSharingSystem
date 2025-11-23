import { Injectable, Signal, computed, inject } from '@angular/core';
import { AppFile } from '../models/app-file.model';
import { FileDragDropService } from './file-drag-drop.service';
import { FileUploadDragDropService } from './file-upload-drag-drop.service';
import { DragDropUtils } from '../utils/drag-drop-utils';

/**
 * Facade combining internal app-file DnD (move) and external upload DnD.
 */
@Injectable()
export class TableDragDropFacade<T extends AppFile = AppFile> {
  private readonly internal = inject(FileDragDropService);
  private readonly external = inject(FileUploadDragDropService);

  readonly dragOverFileId = computed(() =>
    this.internal.dragOverTarget()?.type === 'file'
      ? this.internal.dragOverTarget()!.id
      : null
  );

  readonly fileUploadDragOverFileId = computed(
    () => this.external.hoveredTarget()?.target?.id
  );

  readonly fileUploadTarget = this.external.uploadTarget;
  readonly fileUploadHoverTargetCorrect = computed(
    () =>
      !!this.external.hoveredTarget() &&
      this.external.hoveredTarget()!.target?.id ===
        this.external.uploadTarget()?.id
  );

  readonly fileUploadFileNb = this.external.filesNb;
  readonly fileUploadTableTarget = computed(
    () => this.external.hoveredTarget()?.type === 'table'
  );

  // Row handlers
  rowDragStart(
    event: DragEvent,
    file: T,
    isSelected: (id: number) => boolean,
    selectedFiles: Signal<T[]>,
    previewEl: HTMLElement | null
  ) {
    if (!isSelected(file.id) || event.ctrlKey || event.shiftKey) {
      event.preventDefault();
      return;
    }
    const dragged = selectedFiles();
    this.internal.startDrag(dragged);
    event.dataTransfer?.setData('application/json', JSON.stringify(dragged));
    event.dataTransfer && (event.dataTransfer.effectAllowed = 'move');
    if (previewEl) {
      event.dataTransfer?.setDragImage(previewEl, 0, 0);
    }
  }

  rowDragEnter(event: DragEvent, row: T) {
    event.preventDefault();
    if (this.external.allowExternalFiles(event)) {
      if (row.isDirectory) {
        event.stopPropagation();
        this.external.setHoverTarget({ type: 'directory', target: row }, event);
      }
    } else if (this.internal.allowAppFiles(event)) {
      this.internal.setDragOverTarget('file', row.id);
      this.internal.setDropEffect(event, true);
    }
  }

  rowDragOver(event: DragEvent) {
    event.preventDefault();
    this.internal.setDropEffect(
      event,
      this.internal.allowAppFiles(event) ||
        this.external.allowExternalFiles(event)
    );
  }

  rowDragLeave(event: DragEvent, row: T) {
    event.preventDefault();
    if (!DragDropUtils.isTrueDragLeave(event)) return;

    if (
      this.external.hoveredTarget()?.type === 'directory' &&
      this.external.hoveredTarget()!.target?.id === row.id
    ) {
      this.external.clearHover();
    }

    if (this.internal.dragOverTarget()?.id === row.id) {
      this.internal.clearDragOverTarget();
    }
  }

  async rowDrop(
    event: DragEvent,
    targetFile: T,
    currentDirectoryId: Signal<number | null>,
    isSelected: (id: number) => boolean,
    moveFilesWithFeedback: (
      files: T[],
      targetId: number,
      targetName: string
    ) => void
  ) {
    event.preventDefault();
    event.stopPropagation();

    // External files upload
    if (this.external.allowExternalFiles(event)) {
      const destinationId = this.external.getDestinationFolder(
        targetFile,
        currentDirectoryId()
      );
      await this.external.uploadDraggedFiles(event, destinationId);
      return;
    }

    // Internal move
    if (this.internal.allowAppFiles(event)) {
      const draggedFiles = this.internal.draggedFiles();
      this.internal.clearDrag();
      if (!targetFile.isDirectory || isSelected(targetFile.id)) return;
      moveFilesWithFeedback(
        draggedFiles as T[],
        targetFile.id,
        targetFile.fileName
      );
    }
  }

  // Table handlers
  tableDragEnter(event: DragEvent) {
    event.preventDefault();
    if (this.external.allowExternalFiles(event)) {
      this.external.setHoverTarget({ type: 'table', target: null }, event);
    }
  }

  tableDragOver(event: DragEvent) {
    event.preventDefault();
    this.internal.setDropEffect(
      event,
      this.internal.allowAppFiles(event) ||
        this.external.allowExternalFiles(event)
    );
  }

  async tableDrop(event: DragEvent, destinationId: number | null) {
    event.preventDefault();
    event.stopPropagation();
    if (this.external.allowExternalFiles(event)) {
      await this.external.uploadDraggedFiles(event, destinationId);
    }
  }

  tableDragLeave(event: DragEvent) {
    event.preventDefault();
    if (!DragDropUtils.isTrueDragLeave(event)) return;
    if (this.external.hoveredTarget()?.type === 'table') {
      this.external.clearHover();
    }
  }
}
