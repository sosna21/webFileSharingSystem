import { computed, inject, Injectable, linkedSignal, signal } from '@angular/core';
import { environment } from '../../../environments/environment.development';
import { AppFile } from '../models/app-file.model';
import { httpResource } from '@angular/common/http';
import { FileResponse } from '../models/file-response.model';
import { debouncedSignal } from '../utils/signal-utils';
import { Router } from '@angular/router';

@Injectable({
  providedIn: 'root'
})
export class FileService {

  private readonly fileUrl = `${environment.apiUrl}/File`;
  private readonly sharesUrl = `${environment.apiUrl}/Share`;
  private readonly router = inject(Router);

  public readonly mode = signal<'GetAll' | 'GetSharedWithMe' | 'GetSharedByMe' | 'GetFavourites' | 'GetRecent'>('GetAll');
  public readonly searchedPhrase = signal<string>('');
  public readonly parentId = signal<number | null>(null);
  public readonly currentPage = signal<number>(1);
  public readonly itemsPerPage = signal<number>(9999);
  public readonly files = signal<AppFile[]>([]);
  public readonly loadingData = signal<boolean>(true);

  private readonly currentBaseUrl = computed(() => {
    return this.mode() === 'GetSharedWithMe' ? this.sharesUrl : this.fileUrl;
  });
  private readonly _debouncedSearchedPhrase = debouncedSignal(this.searchedPhrase, 300, '');
  private readonly _request = computed(() => `${this.currentBaseUrl()}/${this.mode()}?PageNumber=${this.currentPage()}&PageSize=${this.itemsPerPage()}
      ${this.parentId() ? '&ParentId=' + this.parentId() : ''}${(this._debouncedSearchedPhrase() !== '') ? '&SearchedPhrase=' + this._debouncedSearchedPhrase() : ''}`);
  private readonly _fileResource = httpResource<FileResponse>(() => this._request());

  private readonly _linkedFilesResponse = linkedSignal<FileResponse | undefined, FileResponse | undefined>({
    source: () => this._fileResource.value(),
    computation: (source, previous) => {
      if (source === undefined && previous?.value !== undefined) {
        return previous?.value;
      }
      return source;
    }
  });
  public readonly fileResource = this._fileResource.asReadonly();
  public readonly fileResponseResource = this._linkedFilesResponse.asReadonly();

  goToFolder(folderId: number | null) {
    this.parentId.set(folderId);

    if (folderId === null)
      this.router.navigate(['/disc', 'home']);
    else
      this.router.navigate(
        ['/disc', 'home', 'folder', folderId]
      );
  }
}
