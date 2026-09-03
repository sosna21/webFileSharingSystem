import { Injectable, computed, inject, signal } from '@angular/core';
import { FileMoveDragDropService } from './file-move-drag-drop.service';
import { FileUploadDragDropService } from './file-upload-drag-drop.service';
import { DragDropUtils } from '../utils/drag-drop-utils';
import { BaseFile, FileStatus } from '../models/base-file.model';
import { ShareAccessMode } from '../models/share-access-mode.model';
import { Breadcrumb } from '../models/breadcrumb.model';
import { FileService } from './file.service';
import { MessageSeverity } from '../models/toast-info.model';
import { ToastService } from './toast.service';

interface HoverTarget {
  type: 'directory' | 'breadcrumb' | 'table';
  dataTransferType: 'internal' | 'external';
  target: BaseFile | Breadcrumb | null;
}

@Injectable()
export class DragDropService<T extends BaseFile | Breadcrumb> {
  private readonly internal = inject(FileMoveDragDropService);
  private readonly external = inject(FileUploadDragDropService);
  private readonly fileService = inject(FileService);
  private readonly toast = inject(ToastService);

  /** Currently hovered target for action */
  readonly hoveredTarget = signal<HoverTarget | null>(null);
  readonly filesNb = signal<number>(0);
  readonly isInternalHover = computed(
    () => this.hoveredTarget()?.dataTransferType === 'internal',
  );

  readonly dragTarget = computed<{
    id: number | null;
    name: string;
    accessMode?: ShareAccessMode;
  } | null>(() => {
    const target = this.hoveredTarget();
    if (!target) return null;

    if (
      target.type === 'directory' &&
      target.target &&
      (target.target as BaseFile).isDirectory
    ) {
      return {
        id: target.target.id,
        name: target.target.fileName,
        accessMode: target.target.accessMode,
      };
    }

    if (target.type === 'breadcrumb' && target.target) {
      return {
        id: target.target.id,
        name: target.target.fileName,
        accessMode: target.target.accessMode,
      };
    }

    const parentBreadcrumb = this.fileService.parentBreadcrumb();
    if (!parentBreadcrumb) return null;
    return {
      id: parentBreadcrumb.id,
      name: parentBreadcrumb.fileName,
      accessMode: parentBreadcrumb.accessMode,
    };
  });

  readonly isHoverTargetATable = computed(
    () => this.hoveredTarget()?.type === 'table',
  );

  readonly hasMinWriteAccess = computed(() => {
    const uploadTarget = this.dragTarget();
    if (!uploadTarget) return false;

    if (
      uploadTarget.accessMode === undefined ||
      uploadTarget.accessMode === null
    )
      return true;

    return uploadTarget.accessMode >= ShareAccessMode.ReadWrite;
  });

  // Row handlers
  rowDragStart(
    event: DragEvent,
    file: BaseFile,
    selectedFiles: BaseFile[],
    previewEl: HTMLElement | null,
  ) {
    if (
      !selectedFiles.find((f) => f.id === file.id) ||
      event.ctrlKey ||
      event.shiftKey
    ) {
      event.preventDefault();
      return;
    }

    const filesToMove = selectedFiles.filter(
      (f) =>
        f.fileStatus === FileStatus.Completed &&
        (f.accessMode === undefined ||
          f.accessMode >= ShareAccessMode.ReadWrite),
    );

    const areFilesDraggable = this.handleUndraggableFiles(
      selectedFiles,
      filesToMove,
    );

    if (!areFilesDraggable) {
      event.preventDefault();
      return;
    }

    this.internal.startDrag(filesToMove);
    event.dataTransfer?.setData('text/plain', 'internal');
    event.dataTransfer && (event.dataTransfer.effectAllowed = 'move');
    if (previewEl) {
      event.dataTransfer?.setDragImage(previewEl, 0, 0);
    }
  }

  handleUndraggableFiles(
    allfiles: BaseFile[],
    draggableFiles: BaseFile[],
  ): boolean {
    if (draggableFiles.length !== allfiles.length) {
      if (draggableFiles.length === 0) {
        this.toast.show(
          $localize`File move`,
          allfiles.length === 1
            ? $localize`The selected file cannot be moved`
            : $localize`You can't move any of the selected files`,
          MessageSeverity.info,
        );
        return false;
      } else {
        this.toast.show(
          $localize`File move`,
          $localize`Some of the selected files cannot be moved and will be ignored`,
          MessageSeverity.info,
        );
      }
    }
    return true;
  }

  breadcrumbDragEnter(event: DragEvent, breadcrumb: Breadcrumb) {
    event.preventDefault();

    const isExternal = this.external.allowExternalFiles(event);
    const isInternal = this.internal.allowAppFiles(event);

    if (isExternal || isInternal) {
      event.stopPropagation();
      this.setHoverTarget(
        {
          type: 'breadcrumb',
          target: breadcrumb,
          dataTransferType: isInternal ? 'internal' : 'external',
        },
        event,
      );

      if (isInternal) {
        this.internal.setDropEffect(event, true);
      }
    }
  }

  rowDragEnter(event: DragEvent, row: BaseFile) {
    event.preventDefault();

    const isExternal = this.external.allowExternalFiles(event);
    const isInternal = this.internal.allowAppFiles(event);

    if ((isExternal || isInternal) && row.isDirectory) {
      event.stopPropagation();
      this.setHoverTarget(
        {
          type: 'directory',
          target: row,
          dataTransferType: isInternal ? 'internal' : 'external',
        },
        event,
      );

      if (isInternal) {
        this.internal.setDropEffect(event, row.isDirectory);
      }
    }
  }

  rowDragOver(event: DragEvent) {
    event.preventDefault();

    this.internal.setDropEffect(
      event,
      this.internal.allowAppFiles(event) ||
        this.external.allowExternalFiles(event),
    );
  }

  rowDragLeave(event: DragEvent, row: T) {
    event.preventDefault();
    if (!DragDropUtils.isTrueDragLeave(event)) return;

    if (this.hoveredTarget()?.target?.id === row.id) {
      this.clearHover();
    }
  }

  async rowDrop(event: DragEvent) {
    event.preventDefault();
    event.stopPropagation();

    let operation: Promise<void> | undefined;

    try {
      if (!this.hasMinWriteAccess()) return;

      const destination = this.dragTarget();
      if (!destination) return;

      const destinationId = destination.id;

      // External files upload
      if (this.external.allowExternalFiles(event)) {
        operation = this.external.uploadDraggedFiles(event, destinationId);
      }
      // Internal move
      else if (this.internal.allowAppFiles(event)) {
        if (this.internal.draggedFiles().some((f) => f.id === destinationId))
          return;

        operation = this.internal.moveDraggedFiles(
          destinationId ?? -1,
          destination.name,
        );
      }
    } finally {
      this.clearDragState();
    }

    await operation;
  }

  rowDragEnd(event: DragEvent) {
    event.preventDefault();
    this.clearDragState();
  }

  // Table handlers
  tableDragEnter(event: DragEvent) {
    event.preventDefault();
    if (this.external.allowExternalFiles(event)) {
      this.setHoverTarget(
        { type: 'table', target: null, dataTransferType: 'external' },
        event,
      );
    }
  }

  tableDragOver(event: DragEvent) {
    event.preventDefault();
    this.internal.setDropEffect(
      event,
      this.internal.allowAppFiles(event) ||
        this.external.allowExternalFiles(event),
    );
  }

  tableDragLeave(event: DragEvent) {
    event.preventDefault();
    if (!DragDropUtils.isTrueDragLeave(event)) return;
    if (this.hoveredTarget()?.type === 'table') {
      this.clearHover();
    }
  }

  setHoverTarget(
    hoverTarget?: HoverTarget,
    event?: DragEvent,
    fileCount?: number,
  ) {
    if (event) {
      fileCount = fileCount ?? this.external.getFileCount(event);
      this.filesNb.set(fileCount);
    }
    this.hoveredTarget.set(hoverTarget ?? null);
  }

  /** Clear hover state */
  clearHover() {
    this.hoveredTarget.set(null);
    this.filesNb.set(0);
  }

  private clearDragState() {
    this.internal.clearDragState();
    this.clearHover();
  }
}
