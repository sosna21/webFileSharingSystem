import {Component, ElementRef, Input, OnDestroy, OnInit, TemplateRef, ViewChild} from '@angular/core';
import {HttpClient} from "@angular/common/http";
import {environment} from "../../../environments/environment";
import {AbstractControl, FormBuilder, FormGroup, ValidatorFn, Validators} from "@angular/forms";
import {Subscription} from "rxjs";
import {ActivatedRoute} from "@angular/router";
import {FileExplorerService} from "../../services/file-explorer.service";
import {BsModalRef, BsModalService} from "ngx-bootstrap/modal";
import {File, FileStatus, ProgressStatus} from "../common/file";
import {DownloadService} from "../../services/download.service";
import {FileUploaderService} from "../../services/file-uploader.service";
import {UploadStatus} from "../common/fileUploadProgress";
import {AuthenticationService} from "../../services/authentication.service";

interface BreadCrumb {
  id: number;
  fileName: string;
}

enum ShareAccessMode {
  ReadOnly,
  ReadWrite,
  FullAccess,
}

interface ShareRequestBody {
  UserNameToShareWith?: string,
  AccessMode?: ShareAccessMode,
  AccessDuration?: any
}

@Component({
  selector: 'app-file-explorer',
  templateUrl: './file-explorer.component.html',
  styleUrls: ['./file-explorer.component.scss']
})
export class FileExplorerComponent implements OnInit, OnDestroy {
  @Input() mode: string = 'GetAll';
  @Input() title: string = 'All Files';
  @ViewChild("fileUpload", {static: false}) fileUpload: ElementRef | undefined;
  parentId: number | null = null;
  fileNameForm!: FormGroup;
  files: File[] = [];
  itemsPerPage = 15;
  currentPage = 1;
  totalItems!: number;
  gRename: boolean = false;
  names: string[] = [];
  searchedPhrase: string | null = null;
  breadCrumbs: BreadCrumb[] = [];
  userSubscription!: Subscription;
  modalRef?: BsModalRef;
  ProgressStatus = ProgressStatus;
  shareRequestBody: ShareRequestBody = {AccessMode: ShareAccessMode.ReadOnly};

  constructor(private http: HttpClient, private formBuilder: FormBuilder, private route: ActivatedRoute, public fileExplorerService: FileExplorerService
    , private modalService: BsModalService, private downloadService: DownloadService, private uploadService: FileUploaderService, private authenticationService: AuthenticationService) {
  }

  private openDropdownToBeHidden: any;

  ngOnInit(): void {

    this.userSubscription = this.route.params.subscribe(params => {

      if (params['id']) {
        this.parentId = +params['id'];
      }
      this.fileExplorerService.searchedText.subscribe(response => {
        this.searchedPhrase = response;
        this.reloadData();
      })

      this.reloadData();
      this.getNames();
      if (this.parentId)
        this.getFilePath(this.parentId);
    });
    this.initializeForm();

    this.uploadService.reportUploadProgress.subscribe(progress => {
      // console.log(progress?.status);
      // console.log(progress?.progress);
      if (progress?.status === UploadStatus.Started) {
        if (progress.parentId === this.parentId) {
          this.getFiles(this.mode, this.parentId, this.searchedPhrase,() => {
            const uploadingFile = this.files.find(f => f.id === progress.fileId);
            if (uploadingFile) uploadingFile.progressStatus = ProgressStatus.Started;
          });
        }
      } else if (progress) {
        const uploadingFile = this.files.find(f => f.id === progress.fileId);
        if (uploadingFile) {

          switch (progress.status) {
            case UploadStatus.InProgress:
              uploadingFile.fileStatus = FileStatus.Incomplete;
              uploadingFile.uploadProgress = progress.progress!;
              uploadingFile.progressStatus = ProgressStatus.Started;
              break;
            case UploadStatus.Stopping:
              uploadingFile.progressStatus = ProgressStatus.Stopping;
              uploadingFile.uploadProgress = progress.progress!;
              break;
            case UploadStatus.Stopped:
              uploadingFile.progressStatus = ProgressStatus.Stopped;
              break;
            case UploadStatus.Resumed:
              uploadingFile.progressStatus = ProgressStatus.Started;
              uploadingFile.uploadProgress = progress.progress!;
              break;
            case UploadStatus.Completed:
              uploadingFile.progressStatus = ProgressStatus.Stopped;
              uploadingFile.fileStatus = FileStatus.Completed;
              break;
          }
        }
      }
    });
  }

  ngOnDestroy(): void {
    this.userSubscription.unsubscribe();
  }

  openModal(template: TemplateRef<any>) {
    this.modalRef = this.modalService.show(template, {class: 'modal-dialog-centered modal-md'});
  }

  confirm(): void {
    this.modalRef?.hide();

    for (let i = 0; i < this.fileExplorerService.filesToDelete.length - 1; i++) {
      this.deleteFile(this.fileExplorerService.filesToDelete[i], false)
    }
    this.deleteFile(this.fileExplorerService.filesToDelete[this.fileExplorerService.filesToDelete.length - 1], true);
  }

  decline(): void {
    this.modalRef?.hide();
  }


  private reloadData(): void {
    this.getFiles(this.mode, this.parentId, this.searchedPhrase);
  }

  initializeForm() {
    this.fileNameForm = this.formBuilder.group({
      dirName: ['folderName', [Validators.required, this.checkNameUnique()]],
      fileName: ['', [Validators.required, this.checkNameUnique()]]
    });
  }

  checkNameUnique(): ValidatorFn {
    return (control: AbstractControl): { [key: string]: any } | null => {
      const forbidden = control?.parent?.controls as any;

      return (forbidden)
        ? !this.names.includes(control?.value) ? null : {isUnique: true}
        : null;
    }
  }

  getFiles(mode: string, parentId: number | null, searchedPhrase: string | null, callBack?: () => void): void {
    this.http.get<any>(`${environment.apiUrl}/File/${mode}?PageNumber=${this.currentPage}&PageSize=${this.itemsPerPage}&ParentId=${parentId ?? -1}${searchedPhrase ? '&SearchedPhrase=' + searchedPhrase : ''}`).subscribe(response => {
      this.totalItems = response.totalCount;
      this.files = response.items;
      this.files.forEach(x => x.progressStatus = ProgressStatus.Stopped);
      callBack?.();
    }, error => {
      console.log(error);
    })
  }

  getNames(): void {
    let parentId = this.parentId ?? -1;
    this.http.get<any>(`${environment.apiUrl}/File/GetNames/${parentId}`).subscribe(response => {
      this.names = response;
    }, error => {
      console.log(error);
    })
  }

  getFilePath(fileId: number) {
    this.http.get<any>(`${environment.apiUrl}/File/GetFilePath/${fileId}`).subscribe(response => {
      this.breadCrumbs = response;
      console.log(this.breadCrumbs);
    }, error => {
      console.log(error);
    })
  }

  downloadFile(file: File) {
    return file.isDirectory
      ? this.downloadService.downloadMultipleFilesDirectUrl([file.id])
      : this.downloadService.downloadSingleFileDirectUrl(file.id);
  }

  downloadMultipleFiles() {
    const fileIdsToDownload = this.files.filter(f => f.checked).map(f => f.id);
    return this.downloadService.downloadMultipleFilesDirectUrl(fileIdsToDownload);
  }

  checkAllCheckBox(ev: any) {
    this.files.forEach(x => x.checked = ev.target.checked)
  }

  isAllCheckBoxChecked() {
    if (this.files.length > 0)
      return this.files.every(file => file.checked)
    return false
  }

  markCheckedFiles() {
    this.fileExplorerService.filesToDelete = this.files.filter(x => x.checked);
  }


  SetFavourite(file: File) {
    if (file.fileStatus === FileStatus.Completed) {
      file.isFavourite = !file.isFavourite;
      this.http.put<any>(`${environment.apiUrl}/File/SetFavourite/${file.id}?value=${file.isFavourite}`, {}).subscribe(() => {
      }, error => {
        console.log(error);
      });
    }
  }

  pageChanged(event: any) {
    this.currentPage = event.page;
    this.reloadData();
  }


  isManyCheckboxesChecked(): boolean {
    return this.files.filter(x => x.checked).length > 1;
  }

  deleteFile(file: File, reload: boolean = true) {
    if (file.isDirectory) {
      this.http.delete(`${environment.apiUrl}/File/DeleteDir/${file.id}`).subscribe(() => {
        reload ? this.reloadData() : null;
        this.authenticationService.updateCurrentUserUsedSpace(-file.size);
        delete this.names[this.names.findIndex(x => x === file.fileName)];
      }, error => {
        console.log(error)
      })
    } else {
      this.http.delete(`${environment.apiUrl}/File/Delete/${file.id}`).subscribe(() => {
        reload ? this.reloadData() : null;
        this.authenticationService.updateCurrentUserUsedSpace(-file.size);
        delete this.names[this.names.findIndex(x => x === file.fileName)];
      }, error => {
        console.log(error)
      })
    }
  }


  moveCopyInit(file?: File) {
    var filesToMoveCopy: File[];
    if (file) {
      filesToMoveCopy = [file];
    } else {
      filesToMoveCopy = this.files.filter(x => x.checked);
    }
    this.fileExplorerService.filesToMoveCopy = filesToMoveCopy;
  }


  moveCopyFiles(copy: boolean, filesToMoveCopy: File[] = this.fileExplorerService.filesToMoveCopy) {
    const parentId = this.parentId ?? -1;
    const fileIds = filesToMoveCopy.map(x => x.id);
    (copy ? this.http.post(`${environment.apiUrl}/File/Copy/${parentId}`, fileIds)
      : this.http.put(`${environment.apiUrl}/File/Move/${parentId}`, fileIds))
      .subscribe(() => {
        if (copy) {
          const totalSize = filesToMoveCopy.reduce((a, b) => a + b.size, 0);
          this.authenticationService.updateCurrentUserUsedSpace(totalSize);
        }
        this.reloadData();
        this.fileExplorerService.filesToMoveCopy = [];
      }, error => {
        console.log(error)
      })
  }

  hideOnSecondOpen(dropdown: any) {
    if (this.openDropdownToBeHidden && dropdown !== this.openDropdownToBeHidden) {
      this.openDropdownToBeHidden.hide();
    }
    this.openDropdownToBeHidden = dropdown;
    console.log(dropdown);
  }


  initDirCreate(form: any) {
    if (!this.gRename) {
      this.fileNameForm.reset();
      this.fileNameForm.markAsUntouched();
      this.gRename = true;
      form.hidden = false;
    }
  }

  createDirectory() {
    if (!this.fileNameForm.get('dirName')?.invalid) {

      let name = this.fileNameForm.get('dirName')?.value;
      this.http.post<any>(`${environment.apiUrl}/File/CreateDir/${name}${this.parentId ? '?parentId=' + this.parentId : ''}`, {}).subscribe(response => {
        let file: File = response;

        this.files.length >= this.itemsPerPage ? this.files.pop() : null;
        file.checked = false;
        file.rename = false;
        file.fileStatus = FileStatus.Completed;
        file.progressStatus = ProgressStatus.Stopped;

        this.files.unshift(file)
        this.names.push(file.fileName);
        this.totalItems++;

        this.gRename = false;
      }, error => {
        console.log(error);
      });
    }
  }

  renameInit(file: File) {
    if (!this.gRename) {
      delete this.names[this.names.findIndex(x => x === file.fileName)];
      this.fileNameForm.get('fileName')?.patchValue(file.fileName);
      this.fileNameForm.markAsTouched();
      file.rename = this.gRename = true;
    }
  }

  rename(file: File) {
    if (this.gRename) {
      this.gRename = false;
      if (!this.fileNameForm.get('fileName')?.invalid) {
        let filename = this.fileNameForm.get('fileName')?.value;

        this.http.put(`${environment.apiUrl}/File/Rename/${file.id}?name=${filename}`, {}).subscribe(() => {
          file.fileName = filename;
          file.modificationDate = new Date();
          this.names.push(file.fileName);
          this.gRename = false;
        }, error => {
          console.log(error)
        })
        this.fileNameForm.reset();
      }
      file.rename = false;
    }
  }

  stopUpload(file: File) {
    if (file.progressStatus === ProgressStatus.Started) {
      file.progressStatus = ProgressStatus.Stopping;
      this.uploadService.pause(file.id);
    }
  }

  continueUpload(file: File) {
    if (file.progressStatus === ProgressStatus.Stopped) {
      let fileInfo = this.uploadService.getCachedFileInfo(file.id);
      if (!fileInfo) {
        const fileUpload = this.fileUpload!.nativeElement;
        fileUpload.onchange = () => {
          if (fileUpload.files === null || fileUpload.files.length <= 0) return;
          fileInfo = {
            partialFileInfo: file.partialFileInfo!,
            file: fileUpload.files[0]
          }
          if (file.fileName !== fileInfo.file.name
            || file.size !== fileInfo.file.size
            || file.mimeType !== fileInfo.file.type) return;
          file.progressStatus = ProgressStatus.Started;
          this.uploadService.resume(file.id, fileInfo, this.parentId);
        };
        fileUpload.click();
      }
      if (fileInfo) {
        file.progressStatus = ProgressStatus.Started;
        this.uploadService.resume(file.id, fileInfo, this.parentId);
      }
    }
  }

  cancelUpload(file: File) {
    this.uploadService.cancel(file.id);
    this.deleteFile(file, false);
    this.files = this.files.filter(x => x != file);
  }

  isCompleted(file: File): boolean {
    return file.fileStatus === FileStatus.Completed;
  }


  shareConfirm() {
    this.modalRef?.hide();
    const fileId = this.fileExplorerService.filesToShare[0].id;

    this.http.post<any>(`${environment.apiUrl}/Share/${fileId}/Add`, this.shareRequestBody ?? {}).subscribe(() => {
      this.files.find(file => file.id === fileId)!.isShared = true;
      this.fileExplorerService.filesToShare = [];
      this.shareRequestBody = {AccessMode: ShareAccessMode.ReadOnly};

    }, error => {
      console.log(error);
      this.fileExplorerService.filesToShare = [];
      this.shareRequestBody = {AccessMode: ShareAccessMode.ReadOnly};
    });
  }

  shareDecline() {
    this.modalRef?.hide();
    this.fileExplorerService.filesToShare = [];
    this.shareRequestBody = {AccessMode: ShareAccessMode.ReadOnly};
  }

  shareGetItemAccessMode(shareType: string) {
    switch (shareType) {
      case "read":
        return ShareAccessMode.ReadOnly;
      case "write":
        return ShareAccessMode.ReadWrite;
      case "full":
        return ShareAccessMode.FullAccess;
      default:
        return ShareAccessMode.ReadOnly;
    }
  }
}
