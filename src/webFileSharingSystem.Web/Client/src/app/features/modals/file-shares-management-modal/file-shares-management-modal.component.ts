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

@Component({
  selector: 'app-file-shares-management-modal',
  imports: [ClicableIconDirective, NgbTooltipModule],
  templateUrl: './file-shares-management-modal.component.html',
  styleUrl: './file-shares-management-modal.component.scss',
})
export class FileSharesManagementModalComponent {
  readonly activeModal = inject(NgbActiveModal);
  readonly title = model('Confirm');
  readonly sharedFile = model<AppFile | null>(null);

  private readonly shareService = inject(FileShareService);
  private readonly modalService = inject(ModalService);
  private readonly toast = inject(ToastService);
  private readonly injector = inject(Injector);

  private readonly url = computed(() =>
    this.sharedFile()
      ? `${this.shareService.sharesUrl}/GetShares/${this.sharedFile()!.id}`
      : undefined,
  );
  readonly sharesResource = httpResource<Share[]>(() => this.url());

  async openAddShareModal() {
    if (!this.sharedFile()) return;
    this.activeModal.update({ modalDialogClass: 'd-none' });

    const shareResults: AddShareRequest[] | null =
      await this.modalService.addFileShareModal(
        {
          title: `Share '${this.sharedFile()!.fileName}'`,
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
          this.toast.show(
            'File Shared',
            `File '${this.sharedFile()!.fileName}' shared successfully with user '${share.sharedWithUserName}'.`,
            MessageSeverity.success,
          );
        },
        error: (err) => {
          console.error(err);
          this.toast.show(
            'Failed to share file',
            err.error || String(err),
            MessageSeverity.error,
          );
        },
      });
    });
  }

  async openEditShareModal(shareToEdit: Share) {
    this.activeModal.update({ modalDialogClass: 'd-none' });
    const editedShare = await this.shareService.editFileShareWithFeedback(
      shareToEdit,
      this.sharedFile()!,
      false,
    );
    this.activeModal.update({ modalDialogClass: '' });
    if (!editedShare) return;
    this.updateShareIfExists(editedShare);
  }

  deleteShare(share: Share) {
    this.shareService.deleteSharesWithFeedback(
      [share],
      (share) => this.deleteFromShareDataIfExists(share),
      false,
    );
  }

  private deleteFromShareDataIfExists(share: Share) {
    this.sharesResource.value.update((shares) =>
      shares ? shares.filter((s) => s.shareId !== share.shareId) : [],
    );
  }

  private updateShareIfExists(updatedShare: Share) {
    this.sharesResource.value.update((shares) =>
      shares
        ? shares.map((share) =>
            share.shareId === updatedShare.shareId ? updatedShare : share,
          )
        : [],
    );
  }

  getLocalised(date: string | null) {
    return date ? new Date(date).toLocaleString() : null;
  }

  getAccessModeName(accessMode: ShareAccessMode) {
    switch (accessMode) {
      case ShareAccessMode.ReadOnly:
        return 'Read only';
      case ShareAccessMode.ReadWrite:
        return 'Read and write';
      case ShareAccessMode.FullAccess:
        return 'Full control';
      default:
        return 'Read only';
    }
  }
}
