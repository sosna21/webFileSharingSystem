import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AppFile } from '../../../core/models/app-file.model';
import { NgbTooltipModule } from '@ng-bootstrap/ng-bootstrap';
import { BaseCellDirective } from '../base-cell.directive';
import { TimeagoPipe } from 'ngx-timeago';

@Component({
  selector: 'app-last-modification-cell',
  imports: [CommonModule, NgbTooltipModule, TimeagoPipe],
  templateUrl: './last-modification-cell.component.html',
})
export class LastModificationCellComponent extends BaseCellDirective<AppFile> {}
