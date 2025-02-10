import {Injectable} from '@angular/core';
import {HttpClient, HttpEvent, HttpEventType} from "@angular/common/http";
import {BehaviorSubject, from, Observable, of, Subscription, throwError} from "rxjs";
import {environment} from "../../environments/environment";
import {UploadFileInfo} from "../models/uploadFileInfo";
import {PartialFileInfo} from "../models/partialFileInfo";
import {catchError, concatMap, finalize, last, retry, tap} from "rxjs/operators";
import {UploadProgressInfo, UploadStatus} from "../Components/common/fileUploadProgress";
import {AuthenticationService} from "./authentication.service";
import {ToastrService} from "ngx-toastr";

@Injectable({
  providedIn: 'root'
})
export class FileUploaderService {
  private uploadingFiles: Record<number, { upload: Subscription, isStopped: boolean }> = [];
  private filesInfo: Record<number, { partialFileInfo: PartialFileInfo, file: File }> = [];
  private reportUploadProgressSource = new BehaviorSubject<UploadProgressInfo | null>(null);
  public reportUploadProgress = this.reportUploadProgressSource.asObservable();

  constructor(private http: HttpClient, private authenticationService: AuthenticationService, private toastr: ToastrService) {
  }

  public upload(file: File, parentId: number | null ) {
    return new Observable(subscriber => {
      this.startFileUpload(file, parentId).subscribe(partialFileInfo => {
        if (file.size === 0) return;
        this.authenticationService.updateCurrentUserUsedSpace(file.size);
        const progress: UploadProgressInfo = {
          status: UploadStatus.Started,
          parentId: parentId,
          fileId: partialFileInfo.fileId,
          progress: 0
        }
        this.reportUploadProgressSource.next(progress)
        this.filesInfo[partialFileInfo.fileId] = {
          partialFileInfo: partialFileInfo,
          file: file
        }

        this.uploadingFiles[partialFileInfo.fileId] = {
          isStopped: false,
          upload: this.sendFile(file, partialFileInfo, progress => {
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
              delete this.filesInfo[partialFileInfo.fileId];
              delete this.uploadingFiles[partialFileInfo.fileId];
              subscriber.next();
              subscriber.complete();
            })
          })
        };
      }, error => {
        if (error.error.length < 100)
          this.toastr.error(error.error, "Upload error");
        else {
          this.toastr.error('See console log for additional info', `"${file.name}" unexpected upload error`)
          console.log(error.error)
        }
      });
    })
  }

  public newDirectoryCreatedForUpload( parentId: number | null ){
    const progress: UploadProgressInfo = {
      status: UploadStatus.Completed,
      parentId: parentId,
      fileId: null,
      progress: 1
    }
    this.reportUploadProgressSource.next(progress);
  }

  public getCachedFileInfo(fileId: number) {
    return this.filesInfo[fileId];
  }

  public resume(fileId: number, fileInfo: { partialFileInfo: PartialFileInfo, file: File }, parentId: number | null = null) {
    this.filesInfo[fileId] = fileInfo;
    this.getMissingChunks(fileId).subscribe(result => {

      const progress: UploadProgressInfo = {
        status: UploadStatus.Resumed,
        parentId: parentId,
        fileId: fileId,
        progress: null
      }
      this.reportUploadProgressSource.next(progress);

      const chunksToUpload = new Map<number, number[]>();
      result.map(x => {
        let start = fileInfo.partialFileInfo.chunkSize * x;
        let end = start + (x == fileInfo.partialFileInfo.numberOfChunks - 1 ? fileInfo.partialFileInfo.lastChunkSize : fileInfo.partialFileInfo.chunkSize);
        chunksToUpload.set(x, [start, end, 0]);
      });

      let partialFileInfo = fileInfo.partialFileInfo;
      this.uploadingFiles[partialFileInfo.fileId] = {
        isStopped: false,
        upload: this.sendFileChunks(fileInfo.file, chunksToUpload, partialFileInfo, progress => {
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
            this.reportUploadProgressSource.next(progress);
            delete this.filesInfo[partialFileInfo.fileId];
            delete this.uploadingFiles[partialFileInfo.fileId];
          })
        })
      };
    });
  }

  public cancel(fileId: number) {
    this.uploadingFiles[fileId]?.upload.unsubscribe();
    delete this.uploadingFiles[fileId];
  }

  public pause(fileId: number) {
    const uploadingFile = this.uploadingFiles[fileId];
    if (uploadingFile)
      uploadingFile.isStopped = true;
  }

  private getMissingChunks(fileId: number): Observable<number[]> {
    return this.http.get<number[]>(`${environment.apiUrl}/Upload/${fileId}/MissingChunks`);
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

  private sendFileChunks(file: File, chunksToUpload: Map<number, number[]>, partialFileInfo: PartialFileInfo, reportProgressFunc: (progress: UploadProgressInfo) => void) {

    let updateProgress = function (event: HttpEvent<any>, index: number, uploadingFiles: Record<number, { upload: Subscription, isStopped: boolean }>) {
      switch (event.type) {
        case HttpEventType.UploadProgress:
          const percentDone = event.loaded / (event.total ?? 1);
          chunksToUpload.get(index)![2] = percentDone;

          break;

        case HttpEventType.Response:
          chunksToUpload.get(index)![2] = 1;
          break;
      }

      let numberOfSuccessfulChunks = partialFileInfo.numberOfChunks - chunksToUpload.size;
      // Calculate sum of all chunks progress / number of chunks
      const fileProgress = ([...chunksToUpload.values()].reduce((a, b) => a + b[2], 0) + numberOfSuccessfulChunks) / partialFileInfo.numberOfChunks;

      if (fileProgress > 0) {
        const uploadingFile = uploadingFiles[partialFileInfo.fileId];
        const status = (uploadingFile?.isStopped ?? true) ? UploadStatus.Stopping : UploadStatus.InProgress;
        const uploadProgress: UploadProgressInfo = {
          status: status,
          fileId: partialFileInfo.fileId,
          progress: fileProgress
        }

        reportProgressFunc(uploadProgress);
      }
    }

    return from(chunksToUpload).pipe(concatMap((element) => {
      const chunk = file.slice(element[1][0], element[1][1]);
      return this.sendChunk(chunk, partialFileInfo.fileId, element[0]).pipe(retry(4))
        .pipe(tap(event => updateProgress(event, element[0], this.uploadingFiles))
          ,catchError(error => throwError(error)));
    })).pipe(last());
  }

  private sendFile(file: File, partialFileInfo: PartialFileInfo, reportProgressFunc: (progress: UploadProgressInfo) => void) {
    const allChunks = new Map<number, number[]>();
    for (let i = 0; i < partialFileInfo.numberOfChunks; i++) {
      let start = partialFileInfo.chunkSize * i;
      let end = start + (i == partialFileInfo.numberOfChunks - 1 ? partialFileInfo.lastChunkSize : partialFileInfo.chunkSize);
      allChunks.set(i, [start, end, 0]);
    }
    return this.sendFileChunks(file, allChunks, partialFileInfo, reportProgressFunc);
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
        uploadingFile.isStopped = false;
        const progress: UploadProgressInfo = {
          status: UploadStatus.Stopped,
          fileId: fileId,
          progress: null
        }
        this.reportUploadProgressSource.next(progress);
      }
    }));
  }

  ensureDirectoryExists(path: string, parentId: number | null) {
    if(path.charAt(0) == '/') path = path.slice(1);
    let folders = path.split("/").slice(0, -1);
    if (folders.length <= 0) return of(null);
    return this.http.post<number | null>(`${environment.apiUrl}/Upload/EnsureDirectory`, {parentId, folders});
  }
}


