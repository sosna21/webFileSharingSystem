import { Component, computed, inject, model, signal } from '@angular/core';
import { NgbActiveModal } from '@ng-bootstrap/ng-bootstrap';
import { FormsModule } from '@angular/forms';
import { ModalService } from '../../../core/services/modal.service';
import { AppFile } from '../../../core/models/app-file.model';
import { ToastService } from '../../../core/services/toast.service';
import { MessageSeverity } from '../../../core/models/toast-info.model';
import { DateUtils } from '../../../core/utils/date-utils';
import { ShareAccessMode } from '../../../core/models/share-access-mode.model';
import { AddShareRequest } from '../../../core/models/add-share-request.model';

@Component({
  selector: 'app-file-share-modal',
  imports: [FormsModule],
  templateUrl: './file-share-modal.component.html',
  styleUrl: './file-share-modal.component.scss',
})
export class FileShareModalComponent {
  readonly activeModal = inject(NgbActiveModal);
  readonly modalService = inject(ModalService);
  readonly toast = inject(ToastService);

  readonly filesToShare = model<AppFile[]>([]);
  readonly title = model('Share file');
  readonly confirmText = model('Share');
  readonly cancelText = model('Cancel');
  readonly shareWith = signal<string>('');
  readonly sharingMultipleFiles = computed(
    () => this.filesToShare().length > 1
  );
  readonly selectedCustomDuration = signal<Date | null>(null);
  readonly selectedCustomDurationString = computed(() =>
    this.selectedCustomDuration()
      ? this.selectedCustomDuration()!.toLocaleString()
      : ''
  );

  // Permission options
  readonly selectedPermission = signal<
    'read-only' | 'read-write' | 'full-control'
  >('read-only');

  // Share duration
  readonly shareDuration = signal<number>(24); // Default 24 hours
  setPermission(permission: 'read-only' | 'read-write' | 'full-control') {
    this.selectedPermission.set(permission);
  }

  confirm() {
    if (!this.shareWith().trim()) return;
    let shareUntil: Date | null = this.selectedCustomDuration();
    if (!shareUntil && this.shareDuration() > 0) {
      shareUntil = DateUtils.addHours(new Date(), this.shareDuration());
    }

    //Create array of share requests for each user to share with (comma separated shareWith string)
    const usersToShareWith = this.shareWith().split(',').map(user => user.trim()).filter(user => user);
    const shareRequests: AddShareRequest[] = usersToShareWith.map(user => ({
      UserNameToShareWith: user,
      AccessMode: this.selectedPermission() === 'read-only'
        ? ShareAccessMode.ReadOnly
        : this.selectedPermission() === 'read-write'
        ? ShareAccessMode.ReadWrite
        : ShareAccessMode.FullAccess,
      ShareValidTo: shareUntil ?? undefined
    }));

    this.activeModal.close(shareRequests);
  }

  async onDurationChange($event: Event) {
    this.selectedCustomDuration.set(null);
    if (this.shareDuration() !== 0) return;
    this.activeModal.update({ modalDialogClass: 'd-none' });
    const result = await this.modalService.pickDateTime({
      title: 'Select Share Expiration Date and Time',
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

  generateShareLink() {
    // TODO: Implement actual link generation flow.
    // Temporary friendly notice to avoid runtime error on click.
    this.toast.show(
      'Share link',
      this.sharingMultipleFiles()
        ? 'Generating links will be available soon.'
        : 'Generating a share link will be available soon.',
      MessageSeverity.info,
      3000
    );
  }
}
