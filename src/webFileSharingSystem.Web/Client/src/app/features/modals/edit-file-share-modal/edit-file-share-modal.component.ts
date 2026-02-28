import { Component, computed, inject, linkedSignal, model, signal } from '@angular/core';
import { NgbActiveModal } from '@ng-bootstrap/ng-bootstrap';
import { ShareAccessMode } from '../../../core/models/share-access-mode.model';
import { ModalService } from '../../../core/services/modal.service';
import { ToastService } from '../../../core/services/toast.service';
import { DateUtils } from '../../../core/utils/date-utils';
import { FormsModule } from '@angular/forms';
import { Share } from '../../../core/models/share.model';
import { UpdateFileShareRequest } from '../../../core/models/update-share-request.model';

@Component({
  selector: 'app-edit-file-share-modal',
  imports: [FormsModule],
  templateUrl: './edit-file-share-modal.component.html',
  styleUrl: './edit-file-share-modal.component.scss'
})
export class EditFileShareModalComponent {
  readonly activeModal = inject(NgbActiveModal);
  readonly modalService = inject(ModalService);
  readonly toast = inject(ToastService);
  readonly ShareAccessMode = ShareAccessMode;

  readonly title = model('Share file');
  readonly shareToModify = model<Share | null>(null);
  readonly shareToModifyDate = computed<Date | null>(() => {
    return this.shareToModify() && this.shareToModify()!.validUntil
      ? new Date(this.shareToModify()!.validUntil!)
      : null;
  });

  readonly shareToModifyDateString = computed(() =>
    this.shareToModifyDate()
      ? this.shareToModifyDate()!.toLocaleString()
      : 'Indefinite'
  );

  readonly selectedCustomDuration = signal<Date | null>(null);
  readonly selectedCustomDurationString = computed(() =>
    this.selectedCustomDuration()
      ? this.selectedCustomDuration()!.toLocaleString()
      : ''
  );

  // Permission options
  readonly selectedPermission = linkedSignal<ShareAccessMode>(() => this.shareToModify()?.accessMode ?? ShareAccessMode.ReadOnly);

  // Share duration
  readonly shareDuration = signal<number>(-2); // -2 special value for "no change"
  setPermission(permission: ShareAccessMode) {
    this.selectedPermission.set(permission);
  }
  private readonly shareValidTo = computed<Date | null>(() => {
    if (this.shareDuration() === -2) {
      return this.shareToModify() ? (this.shareToModify()!.validUntil ? new Date(this.shareToModify()!.validUntil!) : null) : null;
    }
    let shareUntil: Date | null = this.selectedCustomDuration();
    if (!shareUntil && this.shareDuration() > 0) {
      shareUntil = DateUtils.addHours(new Date(), this.shareDuration());
    }
    return shareUntil;
  });

  readonly newShareValidToString = computed(() =>
    this.shareValidTo()
      ? this.shareValidTo()!.toLocaleString()
      : 'Indefinite'
  );

  confirm() {
    if (!this.shareToModify()) return;
    const shareUpdateRequest: UpdateFileShareRequest = {
      AccessMode: this.selectedPermission(),
      ShareValidTo: this.shareValidTo() ?? undefined
    };

    this.activeModal.close(shareUpdateRequest);
  }

  async onDurationChange($event: Event) {
    this.selectedCustomDuration.set(null);
    if (this.shareDuration() !== 0) return;
    await this.pickCustomDateTime();
  }

  private async pickCustomDateTime() {
    this.activeModal.update({ modalDialogClass: 'd-none' });

    const result = await this.modalService.pickDateTime({
      title: 'Select Share Expiration Date and Time',
      pickTime: true,
      initialTime: this.shareToModifyDate()
        ? { hour: this.shareToModifyDate()!.getHours(), minute: this.shareToModifyDate()!.getMinutes(), second: this.shareToModifyDate()!.getSeconds() }
        : { hour: 12, minute: 0, second: 0 },
      initialDate: this.shareToModifyDate() ? this.shareToModifyDate()! : DateUtils.addDays(new Date(), 1),
      minDate: new Date(),
    });

    this.activeModal.update({ modalDialogClass: '' });
    if (!result) {
      this.shareDuration.set(-2);
      return;
    }
    this.selectedCustomDuration.set(result);
  }

  resetValues() {
    this.selectedPermission.set(this.shareToModify()!.accessMode);
    this.shareDuration.set(-2);
  }
}
