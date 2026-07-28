import { inject, Injectable, Injector } from '@angular/core';
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
import { CopyToClipboardModalComponent } from '../../features/modals/copy-to-clipboard-modal/copy-to-clipboard-modal.component';
import { DirectoryCreationModalComponent } from '../../features/modals/directory-creation-modal/directory-creation-modal.component';
import { KeyboardShortcutsModalComponent } from '../../features/modals/keyboard-shortcuts-modal/keyboard-shortcuts-modal.component';
import { FileRenameModalComponent } from '../../features/modals/file-rename-modal/file-rename-modal.component';

@Injectable({
  providedIn: 'root',
})
export class ModalService {
  private readonly modalService = inject(NgbModal);

  closeAll() {
    this.modalService.dismissAll();
  }

  async confirmChoice(
    options: {
      title?: string;
      message?: string;
      confirmText?: string;
      cancelText?: string;
      showPermanentWarning?: boolean;
    },
    closeOtherModals = true,
  ): Promise<boolean> {
    if (closeOtherModals) {
      this.modalService.dismissAll(null);
    }
    try {
      const modalRef = this.modalService.open(ConfirmationModalComponent, {
        centered: true,
      });
      const componentInstance =
        modalRef.componentInstance as ConfirmationModalComponent;
      if (options.title) componentInstance.title.set(options.title);
      if (options.message) componentInstance.message.set(options.message);
      if (options.confirmText)
        componentInstance.confirmText.set(options.confirmText);
      if (options.cancelText)
        componentInstance.cancelText.set(options.cancelText);
      if (options.showPermanentWarning)
        componentInstance.showPermanentWarning.set(
          options.showPermanentWarning,
        );

      const result = await modalRef.result;
      if (result) return true;
      return false;
    } catch {
      return false;
    }
  }

  manageSharesModal(
    options: { sharedFile: AppFile; title?: string },
    injector?: Injector,
  ) {
    this.modalService.dismissAll(null);
    try {
      const modalRef = this.modalService.open(
        FileSharesManagementModalComponent,
        {
          centered: true,
          size: 'lg',
          scrollable: true,
          injector,
        },
      );
      const componentInstance =
        modalRef.componentInstance as FileSharesManagementModalComponent;

      componentInstance.sharedFile.set(options.sharedFile);
      if (options.title) componentInstance.title.set(options.title);

      return modalRef.result.catch(() => null);
    } catch {
      return new Promise(() => null);
    }
  }

  addFileShareModal(
    options: {
      filesToShare: AppFile[];
      title?: string;
    },
    closeOtherModals = true,
    injector?: Injector,
  ): Promise<AddShareRequest[] | null> {
    if (closeOtherModals) {
      this.modalService.dismissAll(null);
    }
    try {
      const modalRef = this.modalService.open(FileShareModalComponent, {
        centered: true,
        injector,
      });
      const componentInstance =
        modalRef.componentInstance as FileShareModalComponent;

      componentInstance.filesToShare.set(options.filesToShare);
      if (options.title) componentInstance.title.set(options.title);

      return modalRef.result.catch(() => null);
    } catch {
      return new Promise(() => null);
    }
  }

  editFileShareModal(
    options: {
      shareToModify: Share;
      title?: string;
    },
    closeOtherModals = true,
    injector?: Injector,
  ): Promise<UpdateFileShareRequest | null> {
    if (closeOtherModals) {
      this.modalService.dismissAll(null);
    }
    try {
      const modalRef = this.modalService.open(EditFileShareModalComponent, {
        centered: true,
        injector,
      });
      const componentInstance =
        modalRef.componentInstance as EditFileShareModalComponent;

      componentInstance.shareToModify.set(options.shareToModify);
      if (options.title) componentInstance.title.set(options.title);

      return modalRef.result.catch(() => null);
    } catch {
      return new Promise(() => null);
    }
  }

  pickDateTime(options: {
    title?: string;
    initialDate?: Date;
    minDate?: Date;
    maxDate?: Date;
    pickTime?: boolean;
    initialTime?: { hour: number; minute: number; second: number };
  }): Promise<Date | null> {
    try {
      const modalRef = this.modalService.open(DatePickerModalComponent, {
        centered: true,
      });
      const componentInstance =
        modalRef.componentInstance as DatePickerModalComponent;
      componentInstance.date.set(
        options.initialDate
          ? DateUtils.dateToStruct(options.initialDate)
          : DateUtils.dateToStruct(new Date()),
      );
      componentInstance.minDate.set(
        options.minDate ? DateUtils.dateToStruct(options.minDate) : null,
      );
      componentInstance.maxDate.set(
        options.maxDate ? DateUtils.dateToStruct(options.maxDate) : null,
      );
      componentInstance.pickTime.set(options.pickTime ?? true);
      componentInstance.time.set(
        options.initialTime ?? { hour: 12, minute: 0, second: 0 },
      );
      if (options.title) componentInstance.title.set(options.title);

      return modalRef.result.catch(() => null); // resolves null on cancel
    } catch {
      return new Promise(() => null);
    }
  }

  copyToClipboard(
    options: {
      textToCopy: string;
      title?: string;
      message?: string;
    },
    closeOtherModals = true,
  ): Promise<boolean> {
    if (closeOtherModals) {
      this.modalService.dismissAll(null);
    }
    try {
      const modalRef = this.modalService.open(CopyToClipboardModalComponent, {
        centered: true,
      });
      const componentInstance =
        modalRef.componentInstance as CopyToClipboardModalComponent;
      componentInstance.textToCopy.set(options.textToCopy);
      if (options.title) componentInstance.title.set(options.title);

      return modalRef.result.catch(() => false);
    } catch {
      return new Promise(() => false);
    }
  }

  getNewDirectoryName(options: {
    startName?: string;
    blacklistedNames?: Set<string>;
  }): Promise<string | null> {
    try {
      const modalRef = this.modalService.open(DirectoryCreationModalComponent, {
        centered: true,
      });
      const componentInstance =
        modalRef.componentInstance as DirectoryCreationModalComponent;
      if (options.startName)
        componentInstance.startDirName.set(options.startName);
      if (options.blacklistedNames)
        componentInstance.blacklistedNames.set(options.blacklistedNames);
      return modalRef.result.catch(() => null);
    } catch {
      return new Promise(() => null);
    }
  }

  getNewFileName(options: {
    startName?: string;
    blacklistedNames?: Set<string>;
  }): Promise<string | null> {
    try {
      const modalRef = this.modalService.open(FileRenameModalComponent, {
        centered: true,
      });
      const componentInstance =
        modalRef.componentInstance as FileRenameModalComponent;
      if (options.startName)
        componentInstance.startFileName.set(options.startName);
      if (options.blacklistedNames)
        componentInstance.blacklistedNames.set(options.blacklistedNames);
      return modalRef.result.catch(() => null);
    } catch {
      return new Promise(() => null);
    }
  }

  keyboardShortcutsModal(): Promise<boolean> {
    if (this.modalService.hasOpenModals()) {
      this.closeAll();
      return new Promise(() => false);
    }
    try {
      const modalRef = this.modalService.open(KeyboardShortcutsModalComponent, {
        centered: true,
        size: 'lg',
        scrollable: true,
      });

      return modalRef.result.catch(() => false);
    } catch {
      return new Promise(() => false);
    }
  }
}
