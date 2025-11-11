import { inject, Injectable } from '@angular/core';
import { NgbModal } from '@ng-bootstrap/ng-bootstrap';
import { ConfirmationModalComponent } from '../../features/modals/confirmation-modal/confirmation-modal.component';
import { FileShareModalComponent } from '../../features/modals/file-share-modal/file-share-modal.component';
import { DatePickerModalComponent } from '../../features/modals/date-picker-modal/date-picker-modal.component';
import { DateUtils } from '../utils/date-utils';
import { AppFile } from '../models/app-file.model';
import { AddShareRequest } from '../models/add-share-request.model';
import { FileSharesManagementModalComponent } from '../../features/modals/file-shares-management-modal/file-shares-management-modal.component';
import { EditFileShareModalComponent } from '../../features/modals/edit-file-share-modal/edit-file-share-modal.component';
import { Share } from '../models/share.model';
import { UpdateFileShareRequest } from '../models/update-share-request.model';

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

  addFileShareModal(options: {
    filesToShare: AppFile[];
    title?: string;
  }): Promise<AddShareRequest[] | null> {
    this.modalService.dismissAll(null);
    try {
      const modalRef = this.modalService.open(FileShareModalComponent, { centered: true });
      const componentInstance = modalRef.componentInstance as FileShareModalComponent;

      componentInstance.filesToShare.set(options.filesToShare);
      if (options.title) componentInstance.title.set(options.title);

      return modalRef.result.catch(() => null);
    } catch {
      return new Promise(() => null);
    }
  }

  editFileShareModal(options: {
    shareToModify: Share;
    title?: string;
  }, closeOtherModals = true): Promise<UpdateFileShareRequest | null> {
    if (closeOtherModals) {
      this.modalService.dismissAll(null);
    }
    try {
      const modalRef = this.modalService.open(EditFileShareModalComponent, { centered: true });
      const componentInstance = modalRef.componentInstance as EditFileShareModalComponent;

      componentInstance.shareToModify.set(options.shareToModify);
      if (options.title) componentInstance.title.set(options.title);

      return modalRef.result.catch(() => null);
    } catch {
      return new Promise(() => null);
    }
  }

  pickDateTime(options: {
    title?: string,
    initialDate?: Date,
    minDate?: Date,
    maxDate?: Date,
    pickTime?: boolean,
    initialTime?: { hour: number; minute: number; second: number }
  }): Promise<Date | null> {
    try {
      const modalRef = this.modalService.open(DatePickerModalComponent, { centered: true });
      const componentInstance = modalRef.componentInstance as DatePickerModalComponent;
      componentInstance.date.set(options.initialDate ? DateUtils.dateToStruct(options.initialDate) : DateUtils.dateToStruct(new Date()));
      componentInstance.minDate.set(options.minDate ? DateUtils.dateToStruct(options.minDate) : null);
      componentInstance.maxDate.set(options.maxDate ? DateUtils.dateToStruct(options.maxDate) : null);
      componentInstance.pickTime.set(options.pickTime ?? true);
      componentInstance.time.set(options.initialTime ?? { hour: 12, minute: 0, second: 0 });
      if (options.title) componentInstance.title.set(options.title);

      return modalRef.result.catch(() => null); // resolves null on cancel
    } catch {
      return new Promise(() => null);
    }
  }


  constructor() { }
}
