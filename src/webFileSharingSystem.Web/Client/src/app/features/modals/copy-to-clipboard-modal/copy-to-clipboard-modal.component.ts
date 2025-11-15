import { Component, inject, model } from '@angular/core';
import { NgbActiveModal, NgbTooltipModule } from '@ng-bootstrap/ng-bootstrap';

@Component({
  selector: 'app-copy-to-clipboard-modal',
  imports: [NgbTooltipModule],
  templateUrl: './copy-to-clipboard-modal.component.html',
  styleUrl: './copy-to-clipboard-modal.component.scss',
})
export class CopyToClipboardModalComponent {
  readonly activeModal = inject(NgbActiveModal);
  readonly title = model('Copy to Clipboard');
  readonly textToCopy = model('');

  copyToClipboard() {
    navigator.clipboard.writeText(this.textToCopy()).then(() => {
      this.activeModal.close(true);
    });
  }
}
