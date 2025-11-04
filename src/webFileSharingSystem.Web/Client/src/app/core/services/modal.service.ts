import { inject, Injectable } from '@angular/core';
import { NgbModal } from '@ng-bootstrap/ng-bootstrap';
import { ConfirmationModalComponent } from '../components/confirmation-modal/confirmation-modal.component';

@Injectable({
  providedIn: 'root'
})
export class ModalService {
  private readonly modalService = inject(NgbModal);

  async confirmChoice(options: {
    title?: string;
    message?: string;
    confirmText?: string;
    cancelText?: string;
    showPermanentWarning?: boolean;
  }) {
    this.modalService.dismissAll(null);
    try {
      const modalRef = this.modalService.open(ConfirmationModalComponent, { centered: true });
      const componentInstance = modalRef.componentInstance as ConfirmationModalComponent;
      if (options.title) componentInstance.title.set(options.title);
      if (options.message) componentInstance.message.set(options.message);
      if (options.confirmText) componentInstance.confirmText.set(options.confirmText);
      if (options.cancelText) componentInstance.cancelText.set(options.cancelText);
      if (options.showPermanentWarning)
        componentInstance.showPermanentWarning.set(options.showPermanentWarning);

      const result = await modalRef.result;
      if (result) return true;
      return false;
    } catch {
      return false;
    }
  }

  constructor() { }
}
