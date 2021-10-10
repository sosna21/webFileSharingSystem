import {Injectable} from '@angular/core';
import {HttpClient, HttpEvent, HttpEventType} from "@angular/common/http";
import {BehaviorSubject, from, Observable, Subscription} from "rxjs";
import {environment} from "../../environments/environment";
import {UploadFileInfo} from "../models/uploadFileInfo";
import {PartialFileInfo} from "../models/partialFileInfo";
import {catchError, concatMap, finalize, last, tap} from "rxjs/operators";
import {UploadProgressInfo, UploadStatus} from "../Components/common/fileUploadProgress";

@Injectable({
  providedIn: 'root'
})
export class FileUploaderService {
  private uploadingFiles: Record<number, { upload: Subscription, isStopped: boolean }> = [];
  private reportUploadProgressSource = new BehaviorSubject<UploadProgressInfo | null>(null);
  public reportUploadProgress = this.reportUploadProgressSource.asObservable();

  constructor(private http: HttpClient) {
  }

  public upload(file: File, parentId: number | null = null) {

    this.startFileUpload(file, parentId).subscribe(partialFileInfo => {
      const progress: UploadProgressInfo = {
        status: UploadStatus.Started,
        parentId: parentId,
        fileId: partialFileInfo.fileId,
        progress: 0
      }
      this.reportUploadProgressSource.next(progress)
      this.uploadingFiles[partialFileInfo.fileId] = {
        upload: this.sendFileAsChunks(file, partialFileInfo, progress => {
          progress.parentId = parentId;
          this.reportUploadProgressSource.next(progress);
        }).subscribe(_ => {
          return this.completeFileUpload(partialFileInfo.fileId).subscribe(_ => {
            const progress: UploadProgressInfo = {
              status: UploadStatus.Completed,
              parentId: parentId,
              fileId: partialFileInfo.fileId,
              progress: 1
            }
            this.reportUploadProgressSource.next(progress)
          })
        }),
        isStopped: false
      };
    });
  }

  public cancel(fileId: number) {
    this.uploadingFiles[fileId]?.upload.unsubscribe();
  }

  public pause(fileId: number) {
    const uploadingFile = this.uploadingFiles[fileId];
    if (uploadingFile)
      uploadingFile.isStopped = true;
  }

  private startFileUpload(file: File, parentId: number | null): Observable<PartialFileInfo> {

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

  private sendFileAsChunks(file: File, partialFileInfo: PartialFileInfo, reportProgressFunc: (progress: UploadProgressInfo) => void) {

    let allChunks: number[][] = [];
    for (let i = 0; i < partialFileInfo.numberOfChunks; i++) {
      let start = partialFileInfo.chunkSize * i;
      let end = start + (i == partialFileInfo.numberOfChunks - 1 ? partialFileInfo.lastChunkSize : partialFileInfo.chunkSize);
      allChunks.push([start, end, i, 0]);
    }

    let updateProgress = function (event: HttpEvent<any>, index: number) {
      switch (event.type) {
        case HttpEventType.UploadProgress:
          const percentDone = event.loaded / (event.total ?? 1);
          console.log(`File "${file.name}" chunk ${index} is ${percentDone * 100}% uploaded.`);
          allChunks[index][3] = percentDone;
          break;

        case HttpEventType.Response:
          console.log(`File "${file.name}" chunk ${index} was completely uploaded!`);
          allChunks[index][3] = 1;
          break;
      }

      // Calculate sum of all chunks progress / number of chunks
      const fileProgress = allChunks.reduce((a, b) => a + b[3], 0) / partialFileInfo.numberOfChunks;

      if (fileProgress > 0) {
        const uploadProgress: UploadProgressInfo = {
          status: UploadStatus.InProgress,
          fileId: partialFileInfo.fileId,
          progress: fileProgress
        }

        console.log(`File "${file.name}" total progress ${fileProgress} was completely uploaded!`);

        reportProgressFunc(uploadProgress);
      }
    }

    return from(allChunks).pipe(concatMap((element) => {
      const chunk = file.slice(element[0], element[1]);
      return this.sendChunk(chunk, partialFileInfo.fileId, element[2])
        .pipe(tap(event => updateProgress(event, element[2])))
        .pipe(catchError(error => error));
    })).pipe(last());
  }

  private sendChunk(chunk: Blob, fileId: number, chunkIndex: number): Observable<any> {
    const chunkForm = new FormData();
    chunkForm.append('chunk', chunk);
    return this.http.put(`${environment.apiUrl}/Upload/${fileId}/Chunk/${chunkIndex}`, chunkForm, {
      reportProgress: true,
      observe: 'events'
    }).pipe(finalize(() => {
      const uploadingFile = this.uploadingFiles[fileId];
      if (uploadingFile?.isStopped ?? false) {
        uploadingFile.upload.unsubscribe();
      }
    }));
  }
}


