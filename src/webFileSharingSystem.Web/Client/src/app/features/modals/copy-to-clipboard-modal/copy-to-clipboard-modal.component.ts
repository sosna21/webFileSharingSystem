import { Component, inject, model } from '@angular/core';
import { NgbActiveModal, NgbTooltipModule } from '@ng-bootstrap/ng-bootstrap';

@Component({
  selector: 'app-copy-to-clipboard-modal',
  imports: [NgbTooltipModule],
  templateUrl: './copy-to-clipboard-modal.component.html',
  styleUrl: './copy-to-clipboard-modal.component.scss',
  host: { 'data-testid': 'copy-to-clipboard-modal' },
})
export class CopyToClipboardModalComponent {
  readonly activeModal = inject(NgbActiveModal);
  readonly title = model($localize`Copy to Clipboard`);
  readonly textToCopy = model('');

  async copyToClipboard() {
    await navigator.clipboard.writeText(this.textToCopy());
    this.activeModal.close(true);
  }
}
