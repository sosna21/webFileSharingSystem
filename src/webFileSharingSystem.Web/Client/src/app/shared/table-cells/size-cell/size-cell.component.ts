import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { BaseFile } from '../../../core/models/base-file.model';
import { FileSizePipe } from '../../../core/pipes/file-size.pipe';
import { BaseCellDirective } from '../base-cell.directive';

@Component({
  selector: 'app-size-cell',
  imports: [CommonModule, FileSizePipe],
  templateUrl: './size-cell.component.html',
  host: {
    'data-content': '',
  },
})
export class SizeCellComponent<
  T extends BaseFile,
> extends BaseCellDirective<T> {}
