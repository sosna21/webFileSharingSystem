import { Component, computed, inject, model, signal } from '@angular/core';
import { NgbActiveModal } from '@ng-bootstrap/ng-bootstrap';
import { FormsModule } from '@angular/forms';
import { ModalService } from '../../../core/services/modal.service';
import { AppFile } from '../../../core/models/app-file.model';
import { DateUtils } from '../../../core/utils/date-utils';
import { ShareAccessMode } from '../../../core/models/share-access-mode.model';
import { AddShareRequest } from '../../../core/models/add-share-request.model';
import { FileShareService } from '../../../core/services/file-share.service';

@Component({
  selector: 'app-file-share-modal',
  imports: [FormsModule],
  templateUrl: './file-share-modal.component.html',
  styleUrl: './file-share-modal.component.scss',
  host: { 'data-testid': 'file-share-modal' },
})
export class FileShareModalComponent {
  readonly activeModal = inject(NgbActiveModal);
  private readonly modalService = inject(ModalService);
  private readonly shareService = inject(FileShareService);
  readonly ShareAccessMode = ShareAccessMode;

  readonly filesToShare = model<AppFile[]>([]);
  readonly title = model($localize`Share file`);
  readonly confirmText = model($localize`Share`);
  readonly cancelText = model($localize`Cancel`);
  readonly shareWith = signal<string>('');
  readonly selectedCustomDuration = signal<Date | null>(null);
  readonly selectedCustomDurationString = computed(() =>
    this.selectedCustomDuration()
      ? this.selectedCustomDuration()!.toLocaleString()
      : '',
  );

  // Permission options
  readonly selectedPermission = signal<ShareAccessMode>(
    ShareAccessMode.ReadOnly,
  );

  // Share duration
  readonly shareDuration = signal<number>(24); // Default 24 hours
  setPermission(permission: ShareAccessMode) {
    this.selectedPermission.set(permission);
  }

  confirm() {
    if (!this.shareWith().trim()) return;
    let shareUntil: Date | null = this.selectedCustomDuration();
    if (!shareUntil && this.shareDuration() > 0) {
      shareUntil = DateUtils.addHours(new Date(), this.shareDuration());
    }

    //Create array of share requests for each user to share with (comma separated shareWith string)
    const usersToShareWith = this.shareWith()
      .split(',')
      .map((user) => user.trim())
      .filter((user) => user);
    const shareRequests: AddShareRequest[] = usersToShareWith.map((user) => ({
      UserNameToShareWith: user,
      AccessMode: this.selectedPermission(),
      ShareValidTo: shareUntil ?? undefined,
    }));

    this.activeModal.close(shareRequests);
  }

  async onDurationChange($event: Event) {
    this.selectedCustomDuration.set(null);
    if (this.shareDuration() !== 0) return;
    await this.pickCustomDateTime();
  }

  private async pickCustomDateTime() {
    this.activeModal.update({ modalDialogClass: 'd-none' });
    const result = await this.modalService.pickDateTime({
      title: $localize`Select Share Expiration Date and Time`,
      pickTime: true,
      initialTime: { hour: 12, minute: 0, second: 0 },
      initialDate: DateUtils.addDays(new Date(), 1),
      minDate: new Date(),
    });
    this.activeModal.update({ modalDialogClass: '' });
    if (!result) {
      this.shareDuration.set(24);
      return;
    }
    this.selectedCustomDuration.set(result);
  }

  async generateShareLink() {
    await this.shareService.generateShareLinkWithFeedback(
      this.filesToShare().map((f) => f.id),
      false,
    );
  }
}
