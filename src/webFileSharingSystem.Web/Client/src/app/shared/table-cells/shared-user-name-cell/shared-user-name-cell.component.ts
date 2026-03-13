import { ChangeDetectionStrategy, Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { SharedFile } from '../../../core/models/shared-file.model';
import { BaseCellDirective } from '../base-cell.directive';

@Component({
  selector: 'app-shared-user-name-cell',
  imports: [CommonModule],
  templateUrl: './shared-user-name-cell.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    class: 'text-nowrap',
  },
})
export class SharedUserNameCellComponent extends BaseCellDirective<SharedFile> {}
