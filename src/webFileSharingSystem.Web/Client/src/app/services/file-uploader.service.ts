import {Injectable, Output, EventEmitter} from '@angular/core';
import {HttpClient, HttpEvent, HttpEventType} from "@angular/common/http";
import {from, Observable} from "rxjs";
import {environment} from "../../environments/environment";
import {UploadFileInfo} from "../models/uploadFileInfo";
import {PartialFileInfo} from "../models/partialFileInfo";
import {catchError, concatMap, last, tap} from "rxjs/operators";
import {FileProgressInfo} from "../Components/common/fileProgressInfo";

@Injectable({
  providedIn: 'root'
})
export class FileUploaderService {
  @Output() onProgressChange = new EventEmitter<FileProgressInfo>();

  constructor(private http: HttpClient) {
  }

  public upload(file: File,  parentId: number | null = null) {
    this.startFileUpload(file, parentId).subscribe(partialFileInfo => {
      this.sendFileAsChunks(file, partialFileInfo).subscribe(_ => {
        return this.completeFileUpload(partialFileInfo.fileId).subscribe()
      })
    });
  }

  private startFileUpload(file: File,  parentId: number | null): Observable<PartialFileInfo> {

    let uploadFileInfo: UploadFileInfo = {
      fileName: file.name,
      size: file.size,
      lastModificationDate: new Date(file.lastModified),
      mimeType: file.type,
      parentId: parentId
    };

    return this.http.post<PartialFileInfo>(`${environment.apiUrl}/Upload/Start`, uploadFileInfo);
  }

  private completeFileUpload(fileId: number): Observable<any> {
    return this.http.put(`${environment.apiUrl}/Upload/${fileId}/Complete`, {});
  }

  private sendFileAsChunks(file: File, partialFileInfo: PartialFileInfo) {

    let allChunks = [];
    for (let i = 0; i < partialFileInfo.numberOfChunks; i++) {
      let start = partialFileInfo.chunkSize * i;
      let end = start + (i == partialFileInfo.numberOfChunks - 1 ? partialFileInfo.lastChunkSize : partialFileInfo.chunkSize);
      allChunks.push([start, end, i]);
    }

    const chunksConcatMap = from(allChunks).pipe(concatMap((element) => {
      const chunk = file.slice(element[0], element[1]);
      return this.sendChunk(chunk, partialFileInfo.fileId, element[2])
        .pipe(tap(event => this.getEventMessage(event, file)))
      //  .pipe(catchError(error => error));
    })).pipe(last());

    return chunksConcatMap;
  }

  private sendChunk(chunk: Blob, fileId: number, chunkIndex: number): Observable<any> {
    const chunkForm = new FormData();
    chunkForm.append('chunk', chunk);
    return this.http.put(`${environment.apiUrl}/Upload/${fileId}/Chunk/${chunkIndex}`, chunkForm, {
      reportProgress: true,
      observe: 'events'
    })
  }

  private getEventMessage(event: HttpEvent<any>, file: File) {
    switch (event.type) {
      case HttpEventType.Sent:
        console.log(`Uploading file "${file.name}" of size ${file.size}.`);
        return `Uploading file "${file.name}" of size ${file.size}.`;

      case HttpEventType.UploadProgress:
        // Compute and show the % done:
        const percentDone = Math.round(100 * event.loaded / (event.total ?? 0));
        console.log(`File "${file.name}" is ${percentDone}% uploaded.`);
        return `File "${file.name}" is ${percentDone}% uploaded.`;

      case HttpEventType.Response:
        console.log(`File "${file.name}" was completely uploaded!`);
        return `File "${file.name}" was completely uploaded!`;

      default:
        console.log(`File "${file.name}" surprising upload event: ${event.type}.`);
        return `File "${file.name}" surprising upload event: ${event.type}.`;
    }
  }

}


