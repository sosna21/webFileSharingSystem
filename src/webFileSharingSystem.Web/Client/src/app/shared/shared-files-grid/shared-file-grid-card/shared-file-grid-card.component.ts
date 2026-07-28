import { CommonModule } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  computed,
  input,
  output,
} from '@angular/core';
import { NgbDropdownModule } from '@ng-bootstrap/ng-bootstrap';
import { TimeagoModule } from 'ngx-timeago';
import { HoverClassDirective } from '../../../core/directives/hover-class.directive';
import {
  FileStatus,
  ProgressStatus,
} from '../../../core/models/base-file.model';
import { CreatedByCellComponent } from '../../table-cells/created-by-cell/created-by-cell.component';
import { SizeCellComponent } from '../../table-cells/size-cell/size-cell.component';
import { SharedFile } from '../../../core/models/shared-file.model';
import { AccessModeCellComponent } from '../../table-cells/access-mode-cell/access-mode-cell.component';
import { ShareAccessMode } from '../../../core/models/share-access-mode.model';
import { SharedUserNameCellComponent } from '../../table-cells/shared-user-name-cell/shared-user-name-cell.component';
import { UploadCancelBtnComponent } from '../../upload-cancel-btn/upload-cancel-btn.component';
import { UploadProgressbarComponent } from '../../table-cells/file-name-cell/upload-progressbar/upload-progressbar.component';
import { UploadStatusComponent } from '../../table-cells/file-name-cell/upload-status/upload-status.component';
import { UploadControlBtnsComponent } from '../../table-cells/file-name-cell/upload-control-btns/upload-control-btns.component';
import { TooltipOnOverflowDirective } from '../../../core/directives/tooltip-on-overflow.directive';

@Component({
  selector: 'app-shared-file-grid-card',
  imports: [
    CommonModule,
    NgbDropdownModule,
    TimeagoModule,
    SizeCellComponent,
    CreatedByCellComponent,
    HoverClassDirective,
    AccessModeCellComponent,
    SharedUserNameCellComponent,
    UploadCancelBtnComponent,
    UploadProgressbarComponent,
    UploadStatusComponent,
    UploadControlBtnsComponent,
    TooltipOnOverflowDirective,
  ],
  templateUrl: './shared-file-grid-card.component.html',
  styleUrl: './shared-file-grid-card.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SharedFileGridCardComponent {
  readonly FileStatus = FileStatus;
  readonly ProgressStatus = ProgressStatus;
  readonly ShareAccessMode = ShareAccessMode;

  readonly file = input.required<SharedFile>();
  readonly selected = input(false);
  readonly loading = input(false);
  readonly dropTarget = input(false);
  readonly currentUserId = input<number | undefined>();
  readonly inRoot = input(false);
  readonly canMove = input(false);

  readonly clickCard = output<MouseEvent>();
  readonly doubleClickCard = output<MouseEvent>();
  readonly mouseDownCard = output<MouseEvent>();
  readonly mouseEnterCard = output<void>();
  readonly mouseUpCard = output<MouseEvent>();
  readonly dragStartCard = output<DragEvent>();
  readonly dragEndCard = output<DragEvent>();
  readonly dragEnterCard = output<DragEvent>();
  readonly dragLeaveCard = output<DragEvent>();
  readonly dragOverCard = output<DragEvent>();
  readonly dropCard = output<DragEvent>();
  readonly contextMenuClick = output<{ event: MouseEvent; file: SharedFile }>();
  readonly stopUpload = output();
  readonly continueUpload = output();
  readonly cancelUpload = output();

  readonly isUploadInProgress = computed(
    () => this.file().fileStatus === FileStatus.Incomplete,
  );

  readonly canShowDropOverlay = computed(
    () =>
      this.dropTarget() &&
      !this.loading() &&
      !this.isUploadInProgress() &&
      !this.selected(),
  );

  readonly fileIcon = computed(() => {
    const file = this.file();

    if (file.isDirectory) {
      return 'bi-folder-fill text-warning';
    }

    if (file.mimeType?.startsWith('image/')) {
      return 'bi-file-earmark-image';
    }

    if (file.mimeType?.startsWith('video/')) {
      return 'bi-file-earmark-play';
    }

    if (file.mimeType?.includes('pdf')) {
      return 'bi-file-earmark-pdf';
    }

    if (file.mimeType?.includes('zip')) {
      return 'bi-file-earmark-zip';
    }

    return 'bi-file-earmark-fill';
  });

  onContextMenuClick($event: PointerEvent) {
    if (this.loading()) {
      $event.preventDefault();
      $event.stopPropagation();
      return;
    }
    this.contextMenuClick.emit({ event: $event, file: this.file() });
  }

  getAccessModeName(accessMode: ShareAccessMode) {
    switch (accessMode) {
      case ShareAccessMode.ReadOnly:
        return 'Read only';
      case ShareAccessMode.ReadWrite:
        return 'Read & write';
      case ShareAccessMode.FullAccess:
        return 'Full control';
      default:
        return 'Read only';
    }
  }
}
