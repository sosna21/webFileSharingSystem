import { Component, computed, inject, Injector, model } from '@angular/core';
import { NgbActiveModal, NgbTooltipModule } from '@ng-bootstrap/ng-bootstrap';
import { AppFile } from '../../../core/models/app-file.model';
import { FileShareService } from '../../../core/services/file-share.service';
import { httpResource } from '@angular/common/http';
import { Share } from '../../../core/models/share.model';
import { ModalService } from '../../../core/services/modal.service';
import { ToastService } from '../../../core/services/toast.service';
import { ShareAccessMode } from '../../../core/models/share-access-mode.model';
import { AddShareRequest } from '../../../core/models/add-share-request.model';
import { MessageSeverity } from '../../../core/models/toast-info.model';
import { ClicableIconDirective } from '../../../core/directives/clicable-icon.directive';
import { ShareClockService } from '../../../core/services/share-clock.service';
import { FileService } from '../../../core/services/file.service';

const EXPIRING_SOON_THRESHOLD_MS = 10 * 60 * 1000;

type ShareStatus = 'active' | 'expiring-soon' | 'expired';

interface ShareRowViewModel {
  share: Share;
  status: ShareStatus;
  validUntilLabel: string;
  canEdit: boolean;
  canCancel: boolean;
}

@Component({
  selector: 'app-file-shares-management-modal',
  imports: [ClicableIconDirective, NgbTooltipModule],
  templateUrl: './file-shares-management-modal.component.html',
  styleUrl: './file-shares-management-modal.component.scss',
  host: { 'data-testid': 'file-shares-management-modal' },
})
export class FileSharesManagementModalComponent {
  readonly activeModal = inject(NgbActiveModal);
  readonly title = model('Confirm');
  readonly sharedFile = model<AppFile | null>(null);

  private readonly shareService = inject(FileShareService);
  private readonly modalService = inject(ModalService);
  private readonly toast = inject(ToastService);
  private readonly injector = inject(Injector);
  private readonly shareClock = inject(ShareClockService);
  private readonly fileService = inject(FileService);

  readonly cancelShare = $localize`Cancel share`;
  readonly cancelExpiredShare = $localize`Cannot cancel expired share`;
  readonly editShare = $localize`Edit share`;
  readonly editExpiredShare = $localize`Cannot edit expired share`;

  private readonly url = computed(() =>
    this.sharedFile()
      ? `${this.shareService.sharesUrl}/GetShares/${this.sharedFile()!.id}`
      : undefined,
  );
  readonly sharesResource = httpResource<Share[]>(() => this.url());
  readonly shareRows = computed<ShareRowViewModel[]>(() => {
    const shares = this.sharesResource.value() ?? [];
    const nowTimestamp = this.shareClock.now();

    return shares.map((share) => {
      const status = this.getShareStatus(share, nowTimestamp);

      if (status === 'expired') {
        return {
          share,
          status,
          validUntilLabel: $localize`Already expired`,
          canEdit: false,
          canCancel: false,
        };
      }

      if (status === 'expiring-soon') {
        const validUntil =
          this.getLocalised(share.validUntil) ?? $localize`Unknown`;
        const validUntilLabel = $localize`Expires soon (${validUntil})`;
        return {
          share,
          status,
          validUntilLabel: validUntilLabel,
          canEdit: true,
          canCancel: true,
        };
      }

      return {
        share,
        status,
        validUntilLabel:
          this.getLocalised(share.validUntil) ?? $localize`No expiration`,
        canEdit: true,
        canCancel: true,
      };
    });
  });

  async openAddShareModal() {
    if (!this.sharedFile()) return;
    this.activeModal.update({ modalDialogClass: 'd-none' });

    const shareResults: AddShareRequest[] | null =
      await this.modalService.addFileShareModal(
        {
          title: $localize`Share '${this.sharedFile()!.fileName}'`,
          filesToShare: [this.sharedFile()!],
        },
        false,
        this.injector,
      );

    this.activeModal.update({ modalDialogClass: '' });
    if (!shareResults) return;

    shareResults.forEach((sr) => {
      this.shareService.shareFile(this.sharedFile()!, sr).subscribe({
        next: (share) => {
          this.sharesResource.value.update((shares) =>
            shares ? [share, ...shares] : [share],
          );
          this.updateSharedFileMetadata([
            share,
            ...(this.sharesResource.value() ?? []).filter(
              (existingShare) =>
                String(existingShare.shareId) !== String(share.shareId),
            ),
          ]);
          this.toast.show(
            $localize`File Shared`,
            $localize`File “${this.sharedFile()!.fileName}” shared successfully with user “${share.sharedWithUserName}”.`,
            MessageSeverity.success,
          );
        },
        error: (err) => {
          console.error(err);
          this.toast.show(
            $localize`Failed to share file`,
            err.error || String(err),
            MessageSeverity.error,
          );
        },
      });
    });
  }

  async openEditShareModal(shareToEdit: Share) {
    if (this.getShareStatus(shareToEdit, this.shareClock.now()) === 'expired') {
      return;
    }

    this.activeModal.update({ modalDialogClass: 'd-none' });
    const editedShare = await this.shareService.editFileShareWithFeedback(
      shareToEdit,
      this.sharedFile()!,
      false,
    );
    this.activeModal.update({ modalDialogClass: '' });
    if (!editedShare) return;
    this.updateShareIfExists(editedShare);
    this.updateSharedFileMetadata(this.sharesResource.value() ?? []);
  }

  deleteShare(share: Share) {
    if (this.getShareStatus(share, this.shareClock.now()) === 'expired') {
      return;
    }

    this.shareService.deleteSharesWithFeedback(
      [share],
      (share) => this.deleteFromShareDataIfExists(share),
      false,
    );
  }

  private deleteFromShareDataIfExists(share: Share) {
    const remainingShares = (this.sharesResource.value() ?? []).filter(
      (existingShare) =>
        String(existingShare.shareId) !== String(share.shareId),
    );
    this.sharesResource.value.set(remainingShares);
    this.updateSharedFileMetadata(remainingShares);
  }

  private updateSharedFileMetadata(shares: Share[]) {
    const sharedFile = this.sharedFile();
    if (!sharedFile) return;

    const indefiniteShareExists = shares.some(
      (share) => share.validUntil === null,
    );
    const latestValidUntil = shares.reduce<string | null>((latest, share) => {
      if (!share.validUntil) return latest;
      if (!latest || Date.parse(share.validUntil) > Date.parse(latest)) {
        return share.validUntil;
      }
      return latest;
    }, null);

    const updates = {
      isShared: shares.length > 0,
      sharedUntil: indefiniteShareExists ? null : latestValidUntil,
    };

    this.sharedFile.set({ ...sharedFile, ...updates });
    this.fileService.updateFile(sharedFile, updates);
  }

  private updateShareIfExists(updatedShare: Share) {
    this.sharesResource.value.update((shares) =>
      shares
        ? shares.map((share) =>
            String(share.shareId) === String(updatedShare.shareId)
              ? updatedShare
              : share,
          )
        : [],
    );
  }

  getLocalised(date: string | null) {
    return date ? new Date(date).toLocaleString() : null;
  }

  private getShareStatus(share: Share, nowTimestamp: number): ShareStatus {
    if (share.validUntil === null) {
      return 'active';
    }

    const validUntilTimestamp = Date.parse(share.validUntil);
    if (
      Number.isNaN(validUntilTimestamp) ||
      validUntilTimestamp < nowTimestamp
    ) {
      return 'expired';
    }

    if (validUntilTimestamp - nowTimestamp <= EXPIRING_SOON_THRESHOLD_MS) {
      return 'expiring-soon';
    }

    return 'active';
  }

  getAccessModeName(accessMode: ShareAccessMode) {
    switch (accessMode) {
      case ShareAccessMode.ReadOnly:
        return $localize`Read only`;
      case ShareAccessMode.ReadWrite:
        return $localize`Read and write`;
      case ShareAccessMode.FullAccess:
        return $localize`Full control`;
      default:
        return $localize`Read only`;
    }
  }
}
