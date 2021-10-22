import { Injectable } from '@angular/core';
import {environment} from "../../environments/environment";

@Injectable({
  providedIn: 'root'
})

export class DownloadService {

  constructor() { }

  public downloadSingleFileDirectUrl(fileId: number) {
    return `${environment.apiUrl}/Download/${fileId}/Anonymous`
  }

  public downloadMultipleFilesDirectUrl(fileIds: number[]) {
    let queryParams = `${fileIds[0]}`;
    for (let i = 1; i < fileIds.length; i++) {
      queryParams += `&fileIds=${fileIds[i]}`
    }
    return `${environment.apiUrl}/Download/Multiple?fileIds=${queryParams}`
  }

}
