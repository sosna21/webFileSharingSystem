import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Observable, tap } from 'rxjs';
import { environment } from '../../../../environments/environment';
import { AppFile } from '../../models/app-file.model';
import { Breadcrumb } from '../../models/breadcrumb.model';
import { FileResponse } from '../../models/file-response.model';
import { SharedFile } from '../../models/shared-file.model';
import { UploadStateDto } from '../../models/upload-state.model';

export interface FileQuery {
  mode: 'GetAll' | 'GetSharedByMe' | 'GetFavourites' | 'GetRecent';
  pageNumber?: number;
  pageSize?: number;
  parentId?: number | null;
  searchedPhrase?: string;
}

@Injectable({
  providedIn: 'root',
})
export class FileApiService {
  private readonly fileUrl = `${environment.apiUrl}/File`;
  private readonly http = inject(HttpClient);

  renameFile(id: number, newFileName: string) {
    const api = `${this.fileUrl}/Rename/${id}?name=${newFileName}`;
    return this.http.put(api, null);
  }

  setFavourite(fileId: number, isFavourite: boolean) {
    const api = `${this.fileUrl}/SetFavourite/${fileId}?value=${isFavourite}`;
    return this.http.put(api, null);
  }

  createDirectory(name: string, parentId: number | null) {
    const api = `${this.fileUrl}/CreateDir/${name}${
      parentId ? '?parentId=' + parentId : ''
    }`;
    return this.http.post<AppFile | SharedFile>(api, null);
  }

  moveFiles(filesIds: number[], targetDirectoryId: number | null) {
    const api = `${this.fileUrl}/Move/${targetDirectoryId ?? -1}`;
    return this.http.put(api, filesIds);
  }

  copyFiles(filesIds: number[], targetDirectoryId: number | null) {
    const api = `${this.fileUrl}/Copy/${targetDirectoryId ?? -1}`;
    return this.http.post<AppFile[]>(api, filesIds);
  }

  deleteFile(fileId: number) {
    const api = `${this.fileUrl}/Delete/${fileId}`;
    return this.http.delete(api);
  }

  getFiles(query: FileQuery) {
    const url = `${this.fileUrl}/${query.mode}?${this.buildQueryParams(query)}`;
    return this.http.get<FileResponse<AppFile>>(url);
  }

  getSharedFiles(query: FileQuery) {
    const url = `${this.fileUrl}/${query.mode}?${this.buildQueryParams(query)}`;
    return this.http.get<FileResponse<SharedFile>>(url);
  }

  getActiveUploads(directoryId: number | null) {
    const api = `${environment.apiUrl}/upload/active${
      directoryId ? '?directoryId=' + directoryId : ''
    }`;
    return this.http.get<UploadStateDto[]>(api);
  }

  private buildQueryParams(query: FileQuery): string {
    const params = new URLSearchParams();
    params.set('PageNumber', String(query.pageNumber ?? 1));
    params.set('PageSize', String(query.pageSize ?? 9999));
    if (query.parentId !== undefined && query.parentId !== null) {
      params.set('ParentId', String(query.parentId));
    }
    if (query.searchedPhrase) {
      params.set('SearchedPhrase', query.searchedPhrase);
    }
    return params.toString();
  }

  getBreadcrumbs(parentId: number | null): Observable<Breadcrumb[]> {
    if (parentId === null)
      return new Observable((subscriber) => subscriber.next([]));
    const url = `${this.fileUrl}/GetFilePath/${parentId}`;
    return this.http.get<Breadcrumb[]>(url);
  }
}
