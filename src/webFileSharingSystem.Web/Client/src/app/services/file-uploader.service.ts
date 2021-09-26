import {Injectable} from '@angular/core';
import {HttpClient} from "@angular/common/http";
import {Observable, forkJoin} from "rxjs";
import {environment} from "../../environments/environment";
import {UploadFileInfo} from "../models/uploadFileInfo";
import {PartialFileInfo} from "../models/partialFileInfo";
import {catchError} from "rxjs/operators";

@Injectable({
  providedIn: 'root'
})
export class FileUploaderService {

  constructor(private http: HttpClient) {
  }

  public upload(file: File) {
    this.startFileUpload(file).subscribe(partialFileInfo => {
      this.sendFileAsChunks(file, partialFileInfo).subscribe(_ => {
        return this.completeFileUpload(partialFileInfo.fileId).subscribe()
      })
    });
  }

  private startFileUpload(file: File): Observable<PartialFileInfo> {

    let uploadFileInfo: UploadFileInfo = {
      fileName: file.name,
      size: file.size,
      lastModificationDate: new Date(file.lastModified),
      mimeType: file.type
    };

    return this.http.post<PartialFileInfo>(`${environment.apiUrl}/Upload/Start`, uploadFileInfo);
  }

  private completeFileUpload(fileId: number): Observable<any> {
    return this.http.put(`${environment.apiUrl}/Upload/${fileId}/Complete`, {});
  }
  //TODO throttle request in order no to execute all at the same time
  private sendFileAsChunks(file: File, partialFileInfo: PartialFileInfo) {

    let allChunks = [];
    for (let i = 0; i < partialFileInfo.numberOfChunks; i++) {
      let start = partialFileInfo.chunkSize * i;
      let end = start + (i == partialFileInfo.numberOfChunks - 1 ? partialFileInfo.lastChunkSize : partialFileInfo.chunkSize);
      const chunk = file.slice(start, end);
      const chunkForm = new FormData();
      chunkForm.append('chunk', chunk);
      const uploadChunk = this.http.put(`${environment.apiUrl}/Upload/${partialFileInfo.fileId}/Chunk/${i}`, chunkForm)
        .pipe(catchError(error => error));
      allChunks.push(uploadChunk);
    }
    return forkJoin(allChunks);
  }
}
