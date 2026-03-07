import { ChangeDetectionStrategy, Component, output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AppFile } from '../../../core/models/app-file.model';
import { NgbTooltipModule } from '@ng-bootstrap/ng-bootstrap';
import { ClicableIconDirective } from '../../../core/directives/clicable-icon.directive';
import { BaseCellDirective } from '../base-cell.directive';
import { FileStatus } from '../../../core/models/base-file.model';

@Component({
  selector: 'app-share-cell',
  imports: [CommonModule, NgbTooltipModule, ClicableIconDirective],
  templateUrl: './share-cell.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ShareCellComponent extends BaseCellDirective<AppFile> {
  FileStatus = FileStatus;

  showShareManagementModal = output<AppFile>();
  shareFile = output<AppFile[]>();

  onShowShareManagementModal(file: AppFile) {
    this.showShareManagementModal.emit(file);
  }

  onShareFile(file: AppFile) {
    this.shareFile.emit([file]);
  }
}
