import { Component, computed, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { Breadcrumb } from '../../../../core/models/breadcrumb.model';
import { FileService } from '../../../../core/services/file.service';
import { ShareAccessMode } from '../../../../core/models/share-access-mode.model';
import { AccessModeIconComponent } from '../../../../shared/access-mode-icon/access-mode-icon.component';
import { NgTemplateOutlet } from '@angular/common';
import { DragDropService } from '../../../../core/services/drag-drop.service';

@Component({
  selector: 'app-shares-breadcrumb',
  imports: [RouterLink, AccessModeIconComponent, NgTemplateOutlet],
  templateUrl: './shares-breadcrumb.component.html',
  styleUrl: './shares-breadcrumb.component.scss',
  host: {
    class:
      'd-flex justify-content-between align-items-center p-2 border border-2 rounded-4 mb-3',
  },
})
export class SharesBreadcrumbComponent {
  readonly ShareAccessMode = ShareAccessMode;
  private readonly dragDropService = inject(DragDropService<Breadcrumb>);
  private readonly fileService = inject(FileService);
  readonly breadCrumbsResource = this.fileService.breadCrumbsResource;
  readonly breadCrumbs = this.fileService.breadCrumbs;

  readonly homeBreadcrumb: Breadcrumb = {
    id: null,
    fileName: 'Shared with me',
    level: 0,
    accessMode: ShareAccessMode.ReadOnly,
    validUntil: null,
  };

  readonly dragOverBreadcrumbId = computed(() =>
    this.dragDropService.hoveredTarget()?.type === 'breadcrumb'
      ? this.dragDropService.hoveredTarget()?.target?.id
      : -1,
  );

  selectFolder(folderId: number | null) {
    if (folderId === null || folderId < 0) folderId = null;
    this.fileService.goToFolder(folderId);
  }

  onDragLeave(event: DragEvent, breadcrumb: Breadcrumb) {
    this.dragDropService.rowDragLeave(event, breadcrumb);
  }

  onDragEnter(event: DragEvent, breadcrumb: Breadcrumb) {
    this.dragDropService.breadcrumbDragEnter(event, breadcrumb);
  }

  onDragOver(event: DragEvent) {
    this.dragDropService.tableDragOver(event);
  }

  async onDrop(event: DragEvent, breadcrumb: Breadcrumb) {
    await this.dragDropService.rowDrop(event);
  }
}
