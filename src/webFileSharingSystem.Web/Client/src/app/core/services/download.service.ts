import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { environment } from '../../../environments/environment.development';
import { DownloadResponse } from '../models/download-response.model';
import { ToastService } from './toast.service';
import { MessageSeverity } from '../models/toast-info.model';
import { BaseFile } from '../models/base-file.model';

@Injectable({
  providedIn: 'root',
})
export class DownloadService {
  readonly downloadsUrl = `${environment.apiUrl}/Download`;
  private readonly http = inject(HttpClient);
  private readonly toast = inject(ToastService);

  getDownloadLink(fileIds: number[]) {
    const params = new URLSearchParams();
    fileIds.forEach((id) => params.append('fileIds', String(id)));
    const url = `${this.downloadsUrl}/url?${params.toString()}`;
    return this.http.post<DownloadResponse>(url, {});
  }

  downloadFilesWithFeedback(files: BaseFile[]) {
    this.getDownloadLink(files.map((f) => f.id)).subscribe({
      next: (response) => {
        window.location.href = response.url;
        this.toast.show(
          $localize`Download Initialized`,
          $localize`Your download will begin shortly.`,
          MessageSeverity.success,
        );
      },
      error: (err) => {
        const errorMessage = err.error || String(err);
        this.toast.show(
          $localize`Download Failed`,
          errorMessage,
          MessageSeverity.error,
        );
      },
    });
  }
}
