import { ChangeDetectionStrategy, Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AppFile } from '../../../core/models/app-file.model';
import { NgbTooltipModule } from '@ng-bootstrap/ng-bootstrap';
import { BaseCellDirective } from '../base-cell.directive';
import { TimeagoModule } from 'ngx-timeago';

@Component({
  selector: 'app-last-modification-cell',
  imports: [CommonModule, NgbTooltipModule, TimeagoModule],
  templateUrl: './last-modification-cell.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class LastModificationCellComponent extends BaseCellDirective<AppFile> {}
