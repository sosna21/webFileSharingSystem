import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { NgbTooltipModule } from '@ng-bootstrap/ng-bootstrap';
import { SharedFile } from '../../../core/models/shared-file.model';
import { BaseCellDirective } from '../base-cell.directive';
import { ShareAccessMode } from '../../../core/models/share-access-mode.model';

@Component({
  selector: 'app-access-mode-cell',
  imports: [CommonModule, NgbTooltipModule],
  templateUrl: './access-mode-cell.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AccessModeCellComponent extends BaseCellDirective<SharedFile> {
  accessModeName = input.required<string>();

  getShortAccessModeName(accessModeName: string): string {
    switch (accessModeName) {
      case 'Read only':
        return 'R';
      case 'Read & write':
        return 'RW';
      case 'Full control':
        return 'Full';
      default:
        return 'R';
    }
  }

  getAccessModeIconClass(accessMode: ShareAccessMode) {
    switch (accessMode) {
      case ShareAccessMode.ReadOnly:
        return 'bi-eye';
      case ShareAccessMode.ReadWrite:
        return 'bi-pencil-fill text-warning-emphasis';
      case ShareAccessMode.FullAccess:
        return 'bi-unlock-fill text-success';
      default:
        return 'bi-eye';
    }
  }
}
