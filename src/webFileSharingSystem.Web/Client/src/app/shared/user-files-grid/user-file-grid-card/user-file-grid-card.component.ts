import { CommonModule } from '@angular/common';
import { Component, computed, input, output } from '@angular/core';
import {
  NgbDropdownModule,
  NgbTooltipModule,
} from '@ng-bootstrap/ng-bootstrap';
import { AppFile } from '../../../core/models/app-file.model';
import {
  FileStatus,
  ProgressStatus,
} from '../../../core/models/base-file.model';
import { SizeCellComponent } from '../../table-cells/size-cell/size-cell.component';
import { CreatedByCellComponent } from '../../table-cells/created-by-cell/created-by-cell.component';
import { HoverClassDirective } from '../../../core/directives/hover-class.directive';
import { UploadProgressbarComponent } from '../../table-cells/file-name-cell/upload-progressbar/upload-progressbar.component';
import { UploadControlBtnsComponent } from '../../table-cells/file-name-cell/upload-control-btns/upload-control-btns.component';
import { TooltipOnOverflowDirective } from '../../../core/directives/tooltip-on-overflow.directive';
import { UploadCancelBtnComponent } from '../../upload-cancel-btn/upload-cancel-btn.component';

@Component({
  selector: 'app-user-file-grid-card',
  imports: [
    CommonModule,
    NgbDropdownModule,
    SizeCellComponent,
    CreatedByCellComponent,
    HoverClassDirective,
    UploadProgressbarComponent,
    UploadControlBtnsComponent,
    TooltipOnOverflowDirective,
    NgbTooltipModule,
    UploadCancelBtnComponent,
  ],
  templateUrl: './user-file-grid-card.component.html',
  styleUrl: './user-file-grid-card.component.scss',
  host: {
    '[class.is-directory]': 'file().isDirectory',
  },
})
export class UserFileGridCardComponent {
  readonly FileStatus = FileStatus;
  readonly ProgressStatus = ProgressStatus;

  readonly file = input.required<AppFile>();
  readonly selected = input(false);
  readonly loading = input(false);
  readonly dropTarget = input(false);
  readonly isUserCreatedFile = input<boolean>(true);

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
  readonly stopUpload = output();
  readonly continueUpload = output();
  readonly cancelUpload = output();

  contextMenuClick = output<{ event: MouseEvent; file: AppFile }>();

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
}
