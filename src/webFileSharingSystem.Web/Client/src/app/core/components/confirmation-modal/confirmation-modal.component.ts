import {Component, inject, model} from '@angular/core';
import { NgbActiveModal } from '@ng-bootstrap/ng-bootstrap';

@Component({
  selector: 'app-confirmation-modal',
  imports: [],
  templateUrl: './confirmation-modal.component.html',
  styleUrl: './confirmation-modal.component.scss'
})
export class ConfirmationModalComponent {
  readonly activeModal = inject(NgbActiveModal);
  readonly title = model('Confirm');
  readonly message = model('Are you sure?');
  readonly confirmText = model('Yes');
  readonly cancelText = model('Cancel');
  readonly showPermanentDeleteWarning = model(false);
}
