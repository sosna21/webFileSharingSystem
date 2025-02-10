import { Injectable } from '@angular/core';
import {environment} from "../../environments/environment";
import {EMPTY} from "rxjs";
import {HttpClient} from "@angular/common/http";

@Injectable({
  providedIn: 'root'
})

export class DownloadService {

  constructor(private http: HttpClient) { }

  public getDownloadLink(fileId: number|null, fileIds: number[]|null) {

    if(fileId)
      return this.http.post<any>(`${environment.apiUrl}/Download/GenerateUrl/${fileId}`, {});

    if(fileIds && fileIds.length > 0) {
      let queryParams = `${fileIds[0]}`;
      for (let i = 1; i < fileIds.length; i++) {
        queryParams += `&fileIds=${fileIds[i]}`
      }
      return this.http.post<any>(`${environment.apiUrl}/Download/GenerateUrl?fileIds=${queryParams}`, {});
    }

    return EMPTY;
  }

}
