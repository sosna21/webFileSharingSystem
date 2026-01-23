import { inject, Injectable } from '@angular/core';
import { AppFile } from '../models/app-file.model';
import { ModalService } from './modal.service';
import { environment } from '../../../environments/environment.development';
import { HttpClient } from '@angular/common/http';
import { AddShareRequest } from '../models/add-share-request.model';
import { bulkAction } from '../utils/bulk-action-util';
import { MessageSeverity } from '../models/toast-info.model';
import { FileService } from './file.service';
import { ToastService } from './toast.service';
import { Share } from '../models/share.model';
import { UpdateFileShareRequest } from '../models/update-share-request.model';
import { lastValueFrom } from 'rxjs';
import { DownloadService } from './download.service';

@Injectable({
  providedIn: 'root',
})
export class FileShareService {
  readonly sharesUrl = `${environment.apiUrl}/Share`;
  private readonly http = inject(HttpClient);
  private readonly fileService = inject(FileService);
  private readonly toast = inject(ToastService);
  private readonly modalService = inject(ModalService);
  private readonly downloadService = inject(DownloadService);

  shareFile(file: AppFile, shareRequest: AddShareRequest) {
    const api = `${this.sharesUrl}/${file.id}`;
    return this.http.post<Share>(api, shareRequest);
  }

  updateFileShare(shareId: number, updateShareRequest: UpdateFileShareRequest) {
    const api = `${this.sharesUrl}/${shareId}`;
    return this.http.put<Share>(api, updateShareRequest);
  }

  deleteFileShare(shareId: number) {
    const api = `${this.sharesUrl}/${shareId}`;
    return this.http.delete(api);
  }

  async deleteSharesWithFeedback(
    sharesToDelete: Share[],
    onSuccess?: (share: Share) => void,
    closeOtherModals: boolean = true
  ): Promise<boolean> {
    if (sharesToDelete.length === 0) {
      return false;
    }
    const totalShares = sharesToDelete.length;

    let confirmText = '';
    if (totalShares === 1) {
      confirmText = `Are you sure you want to cancel share to user '${sharesToDelete[0].sharedWithUserName}'`;
    } else {
      confirmText = `Are you sure you want to cancel these shares?`;
    }

    const confirmationResult = await this.modalService.confirmChoice(
      {
        title: 'Confirm Share Cancellation',
        message: confirmText,
        confirmText: 'Cancel Share(s)',
        cancelText: 'Cancel',
        showPermanentWarning: true,
      },
      closeOtherModals
    );
    if (!confirmationResult) return false;

    bulkAction<Share>({
      items: sharesToDelete,
      action: (share) => this.deleteFileShare(share.shareId),
      onSuccess: onSuccess ?? (() => {}),
      onError: (_, err) => {
        this.toast.show(
          'Share cancellation',
          err.error || String(err),
          MessageSeverity.error
        );
      },
      toast: (title, msg, severity) => this.toast.show(title, msg, severity),
      successMessage: (count) => ({ title: 'Share Cancellation', message: `Cancelled ${count} share(s) successfully` }),
    });
    return true;
  }

  async editFileShareWithFeedback(
    shareToEdit: Share,
    sharedFile: AppFile,
    closeOtherModals: boolean = true
  ) {
    const editedShareData = await this.modalService.editFileShareModal(
      {
        title: `Edit Share for '${sharedFile.fileName}'`,
        shareToModify: shareToEdit,
      },
      closeOtherModals
    );
    if (!editedShareData) return;

    try {
      const result = await lastValueFrom(
        this.updateFileShare(shareToEdit.shareId, editedShareData)
      );
      this.toast.show(
        'File share modified successfully',
        `Updated share with user '${shareToEdit.sharedWithUserName}'`,
        MessageSeverity.success
      );
      return result;
    } catch (err: any) {
      const error = err.error || String(err);
      this.toast.show(
        'Failed to modify file share',
        error || 'Unknown error',
        MessageSeverity.error
      );
      return null;
    }
  }

  async shareFilesWithFeedback(
    files: AppFile[],
    closeOtherModals: boolean = true
  ) {
    const shareTitle =
      files.length === 1
        ? `Share '${files[0].fileName}'`
        : `Share ${files.length} files`;
    const shareResults: AddShareRequest[] | null =
      await this.modalService.addFileShareModal(
        {
          title: shareTitle,
          filesToShare: files,
        },
        closeOtherModals
      );
    if (!shareResults) return;

    // Combine each shareResult with each file
    const shareRequests: { file: AppFile; shareRequest: AddShareRequest }[] =
      files.flatMap((file) =>
        shareResults.map((sr) => ({ file, shareRequest: sr }))
      );

    bulkAction<{ file: AppFile; shareRequest: AddShareRequest}>({
      items: shareRequests,
      action: (item) => this.shareFile(item.file, item.shareRequest),
      beforeStart: (item) => this.fileService.setLoading(item.file.id, true),
      onSuccess: (item) => {
        this.fileService.updateFile(item.file, { isShared: true });
        this.fileService.setLoading(item.file.id, false);
      },
      onError: (item, err) => {
        this.toast.show(
          'Failed to share file',
          err.error || String(err),
          MessageSeverity.error
        );
        this.fileService.setLoading(item.file.id, false);
      },
      toast: (title, msg, severity) => this.toast.show(title, msg, severity),
      successMessage: (count, updated) => {
        if (count === 1) {
          return { title: 'File Share', message: `Shared '${updated[0].file.fileName}' with ${updated[0].shareRequest.UserNameToShareWith}` };
        }
        return { title: 'File Share', message: `Files shared successfully` };
      },
    });
  }

  async generateShareLinkWithFeedback(
    fileIds: number[],
    closeOtherModals: boolean = true
  ) {
    const downloadLink = await lastValueFrom(
      this.downloadService.getDownloadLink(fileIds)
    ).catch((error) => {
      this.toast.show(
        'Link Generation Failed',
        error?.error || String(error),
        MessageSeverity.error
      );
      return null;
    });
    if (!downloadLink) return;

    const result = await this.modalService.copyToClipboard(
      {
        textToCopy: downloadLink.url,
        title: 'Share Link',
      },
      closeOtherModals
    );

    if (!result) return;
    this.modalService.closeAll();
    this.toast.show(
      'Copied to Clipboard',
      'Share link has been copied to clipboard',
      MessageSeverity.success
    );
  }
}
