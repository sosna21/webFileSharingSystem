import { computed, effect, inject, Injectable, linkedSignal, signal } from '@angular/core';
import { environment } from '../../../environments/environment.development';
import { AppFile } from '../models/app-file.model';
import { HttpClient, httpResource } from '@angular/common/http';
import { FileResponse } from '../models/file-response.model';
import { debouncedSignal } from '../utils/signal-utils';
import { Router } from '@angular/router';
import { Breadcrumb } from '../models/breadcrumb.model';

@Injectable({
  providedIn: 'root'
})
export class FileService {
  private readonly fileUrl = `${environment.apiUrl}/File`;
  private readonly sharesUrl = `${environment.apiUrl}/Share`;
  private readonly router = inject(Router);
  private readonly http = inject(HttpClient);

  public readonly mode = signal<'GetAll' | 'GetSharedWithMe' | 'GetSharedByMe' | 'GetFavourites' | 'GetRecent'>('GetAll');
  public readonly searchedPhrase = signal<string>('');
  public readonly parentId = signal<number | null>(null);
  public readonly currentPage = signal<number>(1);
  public readonly itemsPerPage = signal<number>(9999);
  public readonly files = linkedSignal<AppFile[]>(() => this.fileResponseResource()?.items.sort((a, b) => a.fileName.localeCompare(b.fileName)) ?? []);
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

  //breadcumbs
  private readonly _breadcrumbsQuery = computed(() => this.parentId() !== null ? `${this.fileUrl}/GetFilePath/${this.parentId()}` : undefined);
  private readonly _breadCrumbsResource = httpResource<Breadcrumb[]>(() => this._breadcrumbsQuery());
  public readonly breadCrumbsResource = this._breadCrumbsResource.asReadonly();

  goToFolder(folderId: number | null) {
    this.parentId.set(folderId);

    if (folderId === null)
      this.router.navigate(['/disc', 'home']);
    else
      this.router.navigate(
        ['/disc', 'home', 'folder', folderId]
      );
  }

  renameFile(id: number, newFileName: string) {
    const api = `${this.currentBaseUrl()}/Rename/${id}?name=${newFileName}`;
    return this.http.put(api, null);
  }

  setFavourite(file: AppFile) {
    const api = `${this.fileUrl}/SetFavourite/${file.id}?value=${!file.isFavourite}`;
    return this.http.put(api, null);
  }

  createDirectory(name: string) {
    const api = `${this.fileUrl}/CreateDir/${name}${this.parentId() ? '?parentId=' + this.parentId() : ''}`;
    return this.http.post<AppFile>(api, null);
  }
}
