import { Component, input, output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { BaseFile, FileStatus } from '../../../core/models/base-file.model';
import { NgbTooltipModule } from '@ng-bootstrap/ng-bootstrap';
import { BaseCellDirective } from '../base-cell.directive';
import { UploadCancelBtnComponent } from '../../upload-cancel-btn/upload-cancel-btn.component';

@Component({
  selector: 'app-row-selector-cell',
  imports: [CommonModule, NgbTooltipModule, UploadCancelBtnComponent],
  templateUrl: './row-selector-cell.component.html',
})
export class RowSelectorCellComponent<
  T extends BaseFile,
> extends BaseCellDirective<T> {
  FileStatus = FileStatus;

  isLoading = input.required<boolean>();

  cancelFilesUpload = output<T[]>();

  onCancelFilesUpload(file: T) {
    this.cancelFilesUpload.emit([file]);
  }
}
