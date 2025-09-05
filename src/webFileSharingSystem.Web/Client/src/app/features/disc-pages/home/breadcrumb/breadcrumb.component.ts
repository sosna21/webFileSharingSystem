import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { FileService } from '../../../../core/services/file.service';
import { RouterLink } from '@angular/router';
import { Breadcrumb } from '../../../../core/models/breadcrumb.model';
import { FileDragDropService } from '../../../../core/services/file-drag-drop.service';
import { FileUploadDragDropService } from '../../../../core/services/file-upload-drag-drop.service';

@Component({
  selector: 'app-breadcrumb',
  imports: [RouterLink],
  templateUrl: './breadcrumb.component.html',
  styleUrl: './breadcrumb.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    class: 'd-flex justify-content-between align-items-center p-2 border border-2 rounded-4 mb-3'
  }
})
export class BreadcrumbComponent {
  private readonly dragDrop = inject(FileDragDropService);
  readonly uploadDragDrop = inject(FileUploadDragDropService);
  private readonly fileService = inject(FileService);
  readonly breadCrumbsResource = this.fileService.breadCrumbsResource;
  readonly breadCrumbs = computed(() => [this.homeBreadcrumb, ...(this.breadCrumbsResource.value() ?? [])]);
  readonly homeBreadcrumb: Breadcrumb = {
    id: -1,
    fileName: 'Home'
  };
  readonly dragOverBreadcrumbId = computed(() => this.dragDrop.dragOverTarget()?.type === 'breadcrumb' ?
    this.dragDrop.dragOverTarget()?.id
    : this.uploadDragDrop.hoveredTarget()?.type === 'breadcrumb'
      ? this.uploadDragDrop.hoveredTarget()?.target?.id : null
  );

  selectFolder(folderId: number | null) {
    if (folderId === null || folderId < 0) folderId = null;
    this.fileService.goToFolder(folderId);
  }

  onDragLeave($event: DragEvent, breadcrumb: Breadcrumb) {
    if (this.uploadDragDrop.hoveredTarget()?.type === 'breadcrumb' && this.uploadDragDrop.hoveredTarget()?.target?.id === breadcrumb.id) {
      this.uploadDragDrop.clearHover();
    }

    if (this.dragDrop.dragOverTarget()?.id === breadcrumb.id) {
      this.dragDrop.clearDragOverTarget();
    }
  }

  onDragEnd($event: DragEvent, breadcrumb: Breadcrumb) {
    this.dragDrop.clearDragOverTarget();
  }

  onDragOver(event: DragEvent, breadcrumb: Breadcrumb) {
    event.preventDefault();

    if (this.uploadDragDrop.allowExternalFiles(event)) {
      this.uploadDragDrop.setHoverTarget({ type: 'breadcrumb', target: breadcrumb }, event);
    } else if (this.dragDrop.allowAppFiles(event)) {
      this.dragDrop.setDragOverTarget('breadcrumb', breadcrumb.id);
      this.dragDrop.setDropEffect(event, true);
    }
  }

  onDrop(event: DragEvent, breadcrumb: Breadcrumb) {
    event.preventDefault();

    // External files
    if (this.uploadDragDrop.allowExternalFiles(event)) {
      const files = this.uploadDragDrop.getDroppedFiles(event);
      this.uploadDragDrop.uploadDraggedFiles(event, breadcrumb.id);
      return;
    }

    // Internal files
    if (this.dragDrop.allowAppFiles(event)) {
      this.dragDrop.moveFiles(breadcrumb.id, breadcrumb.fileName);
    }
  }
}
