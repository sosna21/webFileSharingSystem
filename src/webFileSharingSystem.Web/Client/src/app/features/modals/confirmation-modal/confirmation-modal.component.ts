import { Component, inject, model } from '@angular/core';
import { NgbActiveModal } from '@ng-bootstrap/ng-bootstrap';

@Component({
  selector: 'app-confirmation-modal',
  imports: [],
  templateUrl: './confirmation-modal.component.html',
  styleUrl: './confirmation-modal.component.scss',
  host: { class: 'd-block', 'data-testid': 'confirm-modal' },
})
export class ConfirmationModalComponent {
  readonly activeModal = inject(NgbActiveModal);
  readonly title = model($localize`Confirm`);
  readonly message = model($localize`Are you sure?`);
  readonly confirmText = model($localize`Yes`);
  readonly cancelText = model($localize`Cancel`);
  readonly showPermanentWarning = model(false);
}
