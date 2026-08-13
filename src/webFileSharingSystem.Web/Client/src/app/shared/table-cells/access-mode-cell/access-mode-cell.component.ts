import { Component, computed, input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { NgbTooltipModule } from '@ng-bootstrap/ng-bootstrap';
import { SharedFile } from '../../../core/models/shared-file.model';
import { BaseCellDirective } from '../base-cell.directive';
import { ShareAccessMode } from '../../../core/models/share-access-mode.model';

@Component({
  selector: 'app-access-mode-cell',
  imports: [CommonModule, NgbTooltipModule],
  templateUrl: './access-mode-cell.component.html',
})
export class AccessModeCellComponent extends BaseCellDirective<SharedFile> {
  readonly nameDisplayMode = input<'full' | 'short' | 'responsive'>(
    'responsive',
  );

  readonly isResponsive = computed(
    () => this.nameDisplayMode() === 'responsive',
  );
  readonly isShort = computed(() => this.nameDisplayMode() === 'short');
  readonly accessModeName = computed(() =>
    this.getAccessModeName(this.file().accessMode),
  );
  readonly shortAccessModeName = computed(() =>
    this.getShortAccessModeName(this.file().accessMode),
  );

  getAccessModeName(accessMode?: ShareAccessMode) {
    switch (accessMode) {
      case ShareAccessMode.ReadOnly:
        return $localize`Read only`;
      case ShareAccessMode.ReadWrite:
        return $localize`Read & write`;
      case ShareAccessMode.FullAccess:
        return $localize`Full control`;
      default:
        return $localize`Read only`;
    }
  }

  getShortAccessModeName(accessMode?: ShareAccessMode): string {
    switch (accessMode) {
      case ShareAccessMode.ReadOnly:
        return $localize`R`;
      case ShareAccessMode.ReadWrite:
        return $localize`RW`;
      case ShareAccessMode.FullAccess:
        return $localize`Full`;
      default:
        return $localize`R`;
    }
  }

  getAccessModeIconClass(accessMode?: ShareAccessMode) {
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
