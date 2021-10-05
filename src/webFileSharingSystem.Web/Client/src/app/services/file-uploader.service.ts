import {Injectable} from '@angular/core';
import {HttpClient} from "@angular/common/http";
import {from, Observable} from "rxjs";
import {environment} from "../../environments/environment";
import {UploadFileInfo} from "../models/uploadFileInfo";
import {PartialFileInfo} from "../models/partialFileInfo";
import {catchError, concatMap, last} from "rxjs/operators";

@Injectable({
  providedIn: 'root'
})
export class FileUploaderService {

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
        .pipe(catchError(error => error));
    })).pipe(last());

    return chunksConcatMap;
  }

  private sendChunk(chunk: Blob, fileId: number, chunkIndex: number): Observable<any> {
    const chunkForm = new FormData();
    chunkForm.append('chunk', chunk);
    return this.http.put(`${environment.apiUrl}/Upload/${fileId}/Chunk/${chunkIndex}`, chunkForm)
  }
}
