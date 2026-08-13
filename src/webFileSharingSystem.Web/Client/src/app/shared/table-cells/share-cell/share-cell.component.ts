import { Component, computed, inject, output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AppFile } from '../../../core/models/app-file.model';
import { NgbTooltipModule } from '@ng-bootstrap/ng-bootstrap';
import { ClicableIconDirective } from '../../../core/directives/clicable-icon.directive';
import { BaseCellDirective } from '../base-cell.directive';
import { FileStatus } from '../../../core/models/base-file.model';
import { ShareClockService } from '../../../core/services/share-clock.service';

const EXPIRING_SOON_THRESHOLD_MS = 10 * 60 * 1000;
type ShareState = 'not-shared' | 'shared' | 'expiring-soon';

@Component({
  selector: 'app-share-cell',
  imports: [CommonModule, NgbTooltipModule, ClicableIconDirective],
  templateUrl: './share-cell.component.html',
})
export class ShareCellComponent extends BaseCellDirective<AppFile> {
  readonly FileStatus = FileStatus;
  private readonly shareClock = inject(ShareClockService);

  readonly showShareManagementModal = output<AppFile>();
  readonly shareFile = output<AppFile[]>();

  readonly shareState = computed(() =>
    this.getShareState(this.file(), this.shareClock.now()),
  );
  readonly shareClass = computed(() => {
    switch (this.shareState()) {
      case 'shared':
        return 'text-primary';
      case 'expiring-soon':
        return 'text-warning';
      default:
        return 'text-secondary';
    }
  });
  readonly shareTooltip = computed(() => {
    if (this.file().fileStatus === FileStatus.Incomplete) {
      return undefined;
    }

    switch (this.shareState()) {
      case 'shared':
        return $localize`Manage shares`;
      case 'expiring-soon':
        return $localize`Share expires soon - manage shares`;
      default:
        return $localize`Share file`;
    }
  });

  onShareAction(file: AppFile) {
    const state = this.getShareState(file, this.shareClock.now());
    if (state === 'shared' || state === 'expiring-soon') {
      this.onShowShareManagementModal(file);
      return;
    }

    this.onShareFile(file);
  }

  onShowShareManagementModal(file: AppFile) {
    this.showShareManagementModal.emit(file);
  }

  onShareFile(file: AppFile) {
    this.shareFile.emit([file]);
  }

  private getShareState(file: AppFile, nowTimestamp: number): ShareState {
    if (!file.isShared) {
      return 'not-shared';
    }

    if (file.sharedUntil === null) {
      return 'shared';
    }

    const sharedUntilTimestamp = Date.parse(file.sharedUntil);
    if (
      Number.isNaN(sharedUntilTimestamp) ||
      sharedUntilTimestamp < nowTimestamp
    ) {
      return 'not-shared';
    }

    if (sharedUntilTimestamp - nowTimestamp <= EXPIRING_SOON_THRESHOLD_MS) {
      return 'expiring-soon';
    }

    return 'shared';
  }
}
