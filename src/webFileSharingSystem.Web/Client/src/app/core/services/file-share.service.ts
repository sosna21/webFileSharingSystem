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
import { share } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class FileShareService {
  private readonly sharesUrl = `${environment.apiUrl}/Share`;
  private readonly http = inject(HttpClient);
  private readonly fileService = inject(FileService);
  private readonly toast = inject(ToastService);
  private readonly modalService = inject(ModalService);

  constructor() { }

  shareFile(file: AppFile, shareRequest: AddShareRequest) {
    const api = `${this.sharesUrl}/${file.id}/Add`;
    return this.http.post(api, shareRequest);
  }

  async shareFilesWithFeedback(files: AppFile[]) {
    const shareTitle = files.length === 1 ? `Share '${files[0].fileName}'` : `Share ${files.length} files`;
    const shareResult = await this.modalService.addFileShareModal({ title: shareTitle, filesToShare: files });
    if (!shareResult) return;

    //TODO
    // Combine shareResult users to share with each file in bulk action
    //const shareRequests = ...

    // bulkAction<{file: AppFile, shareRequest: AddShareRequest}>({
    //   items: ...,
    //   action: file => this.shareFile(file, shareResult),
    //   beforeStart: file => this.fileService.updateFile(file, { loading: true }),
    //   onSuccess: file => this.fileService.turnOffFileLoading(file),
    //   onError: (file, err) => {
    //     this.toast.show(
    //       'Failed to share file',
    //       err instanceof Error ? err.message : String(err),
    //       MessageSeverity.error
    //     );
    //     this.fileService.turnOffFileLoading(file);
    //   },
    //   toast: (title, msg, severity) => this.toast.show(title, msg, severity),
    //   successMessage: count => `Shared ${count} file(s) successfully`
    // });
  }
}
