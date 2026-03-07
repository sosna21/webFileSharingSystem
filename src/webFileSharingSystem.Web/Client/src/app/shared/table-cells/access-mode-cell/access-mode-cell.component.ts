import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { SharedFile } from '../../../core/models/shared-file.model';
import { BaseCellDirective } from '../base-cell.directive';

@Component({
  selector: 'app-access-mode-cell',
  imports: [CommonModule],
  templateUrl: './access-mode-cell.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AccessModeCellComponent extends BaseCellDirective<SharedFile> {
  accessModeName = input.required<string>();
  accessModeIconClass = input.required<string>();
}
