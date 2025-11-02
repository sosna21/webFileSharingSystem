import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { FileService } from '../../../../core/services/file.service';
import { RouterLink } from '@angular/router';
import { Breadcrumb } from '../../../../core/models/breadcrumb.model';
import { FileDragDropService } from '../../../../core/services/file-drag-drop.service';
import { FileUploadDragDropService } from '../../../../core/services/file-upload-drag-drop.service';
import { DragDropUtils } from '../../../../core/utils/drag-drop-utils';
import { AppFile } from '../../../../core/models/app-file.model';
import { ToastService } from '../../../../core/services/toast.service';
import { MessageSeverity } from '../../../../core/models/toast-info.model';

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
  readonly toast = inject(ToastService);
  private readonly fileService = inject(FileService);
  readonly breadCrumbsResource = this.fileService.breadCrumbsResource;
  readonly breadCrumbs = computed(() => [this.homeBreadcrumb, ...(this.breadCrumbsResource.value() ?? [])]);
  readonly homeBreadcrumb: Breadcrumb = {
    id: null,
    fileName: 'Home'
  };
  readonly dragOverBreadcrumbId = computed(() => this.dragDrop.dragOverTarget()?.type === 'breadcrumb' ?
    this.dragDrop.dragOverTarget()?.id
    : this.uploadDragDrop.hoveredTarget()?.type === 'breadcrumb'
      ? this.uploadDragDrop.hoveredTarget()?.target?.id : -1
  );

  selectFolder(folderId: number | null) {
    if (folderId === null || folderId < 0) folderId = null;
    this.fileService.goToFolder(folderId);
  }

  onDragLeave(event: DragEvent, breadcrumb: Breadcrumb) {
    event.preventDefault();
    if (!DragDropUtils.isTrueDragLeave(event))
      return;

    if (this.uploadDragDrop.hoveredTarget()?.type === 'breadcrumb' && this.uploadDragDrop.hoveredTarget()?.target?.id === breadcrumb.id) {
      this.uploadDragDrop.clearHover();
    }

    if (this.dragDrop.dragOverTarget()?.id === breadcrumb.id) {
      this.dragDrop.clearDragOverTarget();
    }
  }

  onDragEnd(event: DragEvent, breadcrumb: Breadcrumb) {
    this.dragDrop.clearDragOverTarget();
  }

  onDragEnter(event: DragEvent, breadcrumb: Breadcrumb) {
    event.preventDefault();

    if (this.uploadDragDrop.allowExternalFiles(event)) {
      this.uploadDragDrop.setHoverTarget({ type: 'breadcrumb', target: breadcrumb }, event);
    } else if (this.dragDrop.allowAppFiles(event)) {
      this.dragDrop.setDragOverTarget('breadcrumb', breadcrumb.id);
    }
  }

  onDragOver(event: DragEvent) {
    event.preventDefault();
    this.dragDrop.setDropEffect(event, this.dragDrop.allowAppFiles(event) || this.uploadDragDrop.allowExternalFiles(event));
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
      this.moveFiles(this.dragDrop.draggedFiles(), breadcrumb.id, breadcrumb.fileName);
    }
  }

  private moveFiles(filesToMove: AppFile[], id: number | null, fileName: string) {
    if (filesToMove.length === 0) return;

    filesToMove.forEach(file => file.loading = true);

    this.fileService.moveFiles(filesToMove.map(file => file.id), id).subscribe({
      next: () => {
        const filesToMoveIds = filesToMove.map(f => f.id);
        //remove moved files from fileList
        this.fileService.files.update(files => files.filter(f => !filesToMoveIds.includes(f.id)));

        this.toast.show(
          filesToMove.length === 1 ? 'File moved' : 'Files moved',
          filesToMove.length === 1
            ? `Moved '${filesToMove[0].fileName}' to '${fileName}'`
            : `Moved ${filesToMove.length} file(s) to '${fileName}'`,
          MessageSeverity.success
        );
      },
      error: (err) => {
        filesToMove.forEach(f => f.loading = false);

        let errorMessage = 'File move failed. Please try again.';
        if (err.error?.errors) {
          errorMessage = Object.values(err.error.errors).flat().join(' ');
        } else if (err.error?.title) {
          errorMessage = err.error.title;
        }
        this.toast.show('File move failed', errorMessage, MessageSeverity.error);
      }
    });
  }
}
