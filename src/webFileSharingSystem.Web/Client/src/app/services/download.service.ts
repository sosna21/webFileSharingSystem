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
}
