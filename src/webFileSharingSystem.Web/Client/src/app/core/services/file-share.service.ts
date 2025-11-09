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

@Injectable({
  providedIn: 'root',
})
export class FileShareService {
  private readonly sharesUrl = `${environment.apiUrl}/Share`;
  private readonly http = inject(HttpClient);
  private readonly fileService = inject(FileService);
  private readonly toast = inject(ToastService);
  private readonly modalService = inject(ModalService);

  constructor() {}

  shareFile(file: AppFile, shareRequest: AddShareRequest) {
    const api = `${this.sharesUrl}/${file.id}`;
    return this.http.post(api, shareRequest);
  }

  async shareFilesWithFeedback(files: AppFile[]) {
    const shareTitle =
      files.length === 1
        ? `Share '${files[0].fileName}'`
        : `Share ${files.length} files`;
    const shareResults: AddShareRequest[] | null =
      await this.modalService.addFileShareModal({
        title: shareTitle,
        filesToShare: files,
      });
    if (!shareResults) return;

    // Combine each shareResult with each file
    const shareRequests: { file: AppFile; shareRequest: AddShareRequest }[] =
      files.flatMap((file) =>
        shareResults.map((sr) => ({ file, shareRequest: sr }))
      );

    bulkAction<{ file: AppFile; shareRequest: AddShareRequest }>({
      items: shareRequests,
      action: (item) => this.shareFile(item.file, item.shareRequest),
      beforeStart: (item) =>
        this.fileService.updateFile(item.file, { loading: true }),
      onSuccess: (item) =>
        this.fileService.updateFile(item.file, {
          loading: false,
          isShared: true,
        }),
      onError: (item, err) => {
        this.toast.show(
          'Failed to share file',
          err instanceof Error ? err.message : String(err),
          MessageSeverity.error
        );
        this.fileService.turnOffFileLoading(item.file);
      },
      toast: (title, msg, severity) => this.toast.show(title, msg, severity),
      successMessage: (count, updated) => {
        if (count === 1) {
          return `Shared '${updated[0].file.fileName}' with ${updated[0].shareRequest.UserNameToShareWith}`;
        }
        return `Files shared successfully`;
      },
    });
  }
}
