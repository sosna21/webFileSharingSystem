import {
  ChangeDetectionStrategy,
  Component,
  input,
  output,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { BaseFile, FileStatus } from '../../../core/models/base-file.model';
import { NgbTooltipModule } from '@ng-bootstrap/ng-bootstrap';
import { ClicableIconDirective } from '../../../core/directives/clicable-icon.directive';
import { BaseCellDirective } from '../base-cell.directive';

@Component({
  selector: 'app-row-selector-cell',
  imports: [CommonModule, NgbTooltipModule, ClicableIconDirective],
  templateUrl: './row-selector-cell.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
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
