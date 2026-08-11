import { Component, computed, inject } from '@angular/core';
import { FileService } from '../../core/services/file.service';
import { RouterLink } from '@angular/router';
import { Breadcrumb } from '../../core/models/breadcrumb.model';
import { DragDropService } from '../../core/services/drag-drop.service';
import { ShareAccessMode } from '../../core/models/share-access-mode.model';
import { AccessModeIconComponent } from '../access-mode-icon/access-mode-icon.component';
import { NgTemplateOutlet } from '@angular/common';

@Component({
  selector: 'app-breadcrumb',
  imports: [RouterLink, AccessModeIconComponent, NgTemplateOutlet],
  templateUrl: './breadcrumb.component.html',
  styleUrl: './breadcrumb.component.scss',
  host: {
    class:
      'd-flex justify-content-between align-items-center p-2 border border-2 rounded-4 mb-3',
    style: 'min-height: 52px;',
    '(window:keydown)': 'onKeydown($event)',
  },
})
export class BreadcrumbComponent {
  readonly ShareAccessMode = ShareAccessMode;
  private readonly dragDropService = inject(DragDropService<Breadcrumb>);
  private readonly fileService = inject(FileService);
  readonly breadCrumbsResource = this.fileService.breadCrumbsResource;
  readonly breadCrumbs = this.fileService.breadCrumbs;

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

  onKeydown(event: KeyboardEvent) {
    if (event.altKey && event.key === 'ArrowUp') {
      event.preventDefault();
      const crumbs = this.breadCrumbs();
      if (crumbs && crumbs.length > 1) {
        const parentFolder = crumbs[crumbs.length - 2];
        this.selectFolder(parentFolder.id);
      }
    }
  }
}
