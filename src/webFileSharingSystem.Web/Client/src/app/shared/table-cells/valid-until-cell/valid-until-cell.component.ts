import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { SharedFile } from '../../../core/models/shared-file.model';
import { BaseCellDirective } from '../base-cell.directive';
import { RemainigTimePipe } from '../../../core/pipes/remainig-time.pipe';

@Component({
  selector: 'app-valid-until-cell',
  imports: [CommonModule, RemainigTimePipe],
  templateUrl: './valid-until-cell.component.html',
  host: {
    'data-content': '',
  },
})
export class ValidUntilCellComponent extends BaseCellDirective<SharedFile> {}
