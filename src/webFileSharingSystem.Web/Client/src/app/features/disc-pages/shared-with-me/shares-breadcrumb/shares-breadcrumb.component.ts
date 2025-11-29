import { Component, computed, inject, linkedSignal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { Breadcrumb } from '../../../../core/models/breadcrumb.model';
import { FileDragDropService } from '../../../../core/services/file-drag-drop.service';
import { FileUploadDragDropService } from '../../../../core/services/file-upload-drag-drop.service';
import { DragDropUtils } from '../../../../core/utils/drag-drop-utils';
import { SharedFilesService } from '../../../../core/services/shared-files.service';

@Component({
  selector: 'app-shares-breadcrumb',
  imports: [RouterLink],
  templateUrl: './shares-breadcrumb.component.html',
  styleUrl: './shares-breadcrumb.component.scss',
  host: {
    class:
      'd-flex justify-content-between align-items-center p-2 border border-2 rounded-4 mb-3',
  },
})
export class SharesBreadcrumbComponent {
  private readonly dragDrop = inject(FileDragDropService);
  readonly uploadDragDrop = inject(FileUploadDragDropService);
  private readonly sharesService = inject(SharedFilesService);
  readonly breadCrumbsResource = this.sharesService.breadCrumbsResource;
  readonly breadCrumbs = linkedSignal<Breadcrumb[] | undefined, Breadcrumb[]>({
    source: () => this.breadCrumbsResource.value(),
    computation: (source, previous) => {
      if (source) return [this.homeBreadcrumb, ...source];
      if (this.breadCrumbsResource.isLoading() && previous)
        return previous.value;
      return [this.homeBreadcrumb];
    },
  });

  readonly homeBreadcrumb: Breadcrumb = {
    id: null,
    fileName: 'Root',
  };

  readonly dragOverBreadcrumbId = computed(() =>
    this.dragDrop.dragOverTarget()?.type === 'breadcrumb'
      ? this.dragDrop.dragOverTarget()?.id
      : this.uploadDragDrop.hoveredTarget()?.type === 'breadcrumb'
      ? this.uploadDragDrop.hoveredTarget()?.target?.id
      : -1
  );

  selectFolder(folderId: number | null) {
    if (folderId === null || folderId < 0) folderId = null;
    this.sharesService.goToFolder(folderId);
  }

  //TODO: Enable drag and drop in shares breadcrumb
  //Disable for Root as it do not support moving or uploading files
  //Allow only if breadcrumb/directory has enough permissions ( min ReadWrite)

  // onDragLeave(event: DragEvent, breadcrumb: Breadcrumb) {
  //   event.preventDefault();
  //   if (!DragDropUtils.isTrueDragLeave(event)) return;

  //   if (
  //     this.uploadDragDrop.hoveredTarget()?.type === 'breadcrumb' &&
  //     this.uploadDragDrop.hoveredTarget()?.target?.id === breadcrumb.id
  //   ) {
  //     this.uploadDragDrop.clearHover();
  //   }

  //   if (this.dragDrop.dragOverTarget()?.id === breadcrumb.id) {
  //     this.dragDrop.clearDragOverTarget();
  //   }
  // }

  // onDragEnd(event: DragEvent, breadcrumb: Breadcrumb) {
  //   this.dragDrop.clearDragOverTarget();
  // }

  // onDragEnter(event: DragEvent, breadcrumb: Breadcrumb) {
  //   event.preventDefault();

  //   if (this.uploadDragDrop.allowExternalFiles(event)) {
  //     this.uploadDragDrop.setHoverTarget(
  //       { type: 'breadcrumb', target: breadcrumb },
  //       event
  //     );
  //   } else if (this.dragDrop.allowAppFiles(event)) {
  //     this.dragDrop.setDragOverTarget('breadcrumb', breadcrumb.id);
  //   }
  // }

  // onDragOver(event: DragEvent) {
  //   event.preventDefault();
  //   this.dragDrop.setDropEffect(
  //     event,
  //     this.dragDrop.allowAppFiles(event) ||
  //       this.uploadDragDrop.allowExternalFiles(event)
  //   );
  // }

  // onDrop(event: DragEvent, breadcrumb: Breadcrumb) {
  //   event.preventDefault();

  //   // External files
  //   if (this.uploadDragDrop.allowExternalFiles(event)) {
  //     this.uploadDragDrop.uploadDraggedFiles(event, breadcrumb.id);
  //     return;
  //   }

  //   // Internal files
  //   if (this.dragDrop.allowAppFiles(event)) {
  //     this.sharesService.moveFilesWithFeedback(
  //       this.dragDrop.draggedFiles(),
  //       breadcrumb.id,
  //       breadcrumb.fileName
  //     );
  //   }
  // }
}
