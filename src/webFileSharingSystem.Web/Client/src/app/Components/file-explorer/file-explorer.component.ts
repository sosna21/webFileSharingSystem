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
import {ToastrService} from "ngx-toastr";
import { AccessMode } from '../common/sharedFile';

interface BreadCrumb {
  id: number;
  fileName: string;
}

interface ShareRequestBody {
  UserNameToShareWith?: string,
  AccessMode?: AccessMode,
  AccessDuration?: any,
  Update?: boolean
}

interface ShareResponse {
  shareId: number;
  sharedWithUserName: string,
  accessMode: AccessMode,
  validUntil: Date
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
  loadingData: boolean = true;
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
  modalRef?: BsModalRef;
  ProgressStatus = ProgressStatus;
  shareRequestBody: ShareRequestBody = {AccessMode: AccessMode.ReadOnly};
  shares: ShareResponse[] = [];
  maxDate = '9999-12-31T23:59:59.9999999'

  private subscriptions: Subscription[] = []

  constructor(private http: HttpClient, private formBuilder: FormBuilder, private route: ActivatedRoute, public fileExplorerService: FileExplorerService
    , private modalService: BsModalService, private downloadService: DownloadService, private uploadService: FileUploaderService, private authenticationService: AuthenticationService
    , private toastr: ToastrService) {
  }

  private openDropdownToBeHidden: any;

  ngOnInit(): void {

    this.subscriptions.push(this.route.params.subscribe(params => {
      if (params['id']) {
        this.fileExplorerService.updateParentId(+params['id']);
      } else {
        this.fileExplorerService.updateParentId(null);
      }
      this.parentId = this.fileExplorerService.currentParentIdValue;

      let reloadSearchWhenEmpty = false;
      this.subscriptions.push(this.fileExplorerService.searchedText.subscribe(response => {
        if (!this.authenticationService.currentUserValue) return;
        this.searchedPhrase = response;
        if(reloadSearchWhenEmpty || (response && response !== '')){
          this.reloadData();
          reloadSearchWhenEmpty = true;
        }
      }))

      this.reloadData();
      this.getNames();
      if (this.parentId)
        this.getFilePath(this.parentId);
    }));

    this.initializeForm();

    this.subscriptions.push(this.uploadService.reportUploadProgress.subscribe(info => {
      if (info?.status === UploadStatus.Started || info?.fileId === null) {
        if (info.parentId === this.parentId || this.mode === "GetFavourites") {
          this.getFiles(this.mode, this.parentId, this.searchedPhrase, () => {
            const uploadingFile = this.files.find(f => f.id === info.fileId);
            if (uploadingFile) uploadingFile.progressStatus = ProgressStatus.Started;
          });
        }
      } else if (info) {
        const uploadingFile = this.files.find(f => f.id === info.fileId);
        if (uploadingFile) {

          switch (info.status) {
            case UploadStatus.InProgress:
              uploadingFile.fileStatus = FileStatus.Incomplete;
              uploadingFile.uploadProgress = info.progress!;
              uploadingFile.progressStatus = ProgressStatus.Started;
              break;
            case UploadStatus.Stopping:
              uploadingFile.progressStatus = ProgressStatus.Stopping;
              uploadingFile.uploadProgress = info.progress!;
              break;
            case UploadStatus.Stopped:
              uploadingFile.progressStatus = ProgressStatus.Stopped;
              break;
            case UploadStatus.Resumed:
              uploadingFile.progressStatus = ProgressStatus.Started;
              uploadingFile.uploadProgress = info.progress ?? uploadingFile.uploadProgress;
              break;
            case UploadStatus.Completed:
              uploadingFile.progressStatus = ProgressStatus.Stopped;
              uploadingFile.fileStatus = FileStatus.Completed;
              break;
          }
        }
      }
    }));
  }

  ngOnDestroy(): void {
    this.subscriptions.forEach((subscription) => subscription.unsubscribe());
  }

  openModal(template: TemplateRef<any>) {
    this.getShares(this.fileExplorerService.filesToShare[0]?.id);

    this.modalRef = this.modalService.show(template, {class: 'modal-dialog-centered modal-md'});
    // @ts-ignore //TODO resolve in another way
    if (template._declarationTContainer.localNames[0] === 'shareTemplate'){
      this.modalRef?.onHidden?.subscribe(() => this.shareRequestBody = {AccessMode: AccessMode.ReadOnly});
    }
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
    this.http.get<any>(`${environment.apiUrl}/File/${mode}?PageNumber=${this.currentPage}&PageSize=${this.itemsPerPage}
      ${parentId ? '&ParentId=' + parentId : ''}${(searchedPhrase && searchedPhrase !== '') ? '&SearchedPhrase=' + searchedPhrase : ''}`)
      .subscribe(response => {
        this.loadingData = false;
        this.totalItems = response.totalCount;
        this.files = response.items;
        this.files.forEach(x => x.progressStatus = ProgressStatus.Stopped);
        callBack?.();
      }, error => {
        this.loadingData = false;
        console.log(error);
      })
  }

  getShares(fileId: number): void {
    this.http.get<any>(`${environment.apiUrl}/Share/GetShares/${fileId}`).subscribe(response => {
      this.shares = response;
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
    }, error => {
      console.log(error);
    })
  }

  downloadFile(file: File) {
    const getDownloadLinkObservable = file.isDirectory
      ? this.downloadService.getDownloadLink(null, [file.id])
      : this.downloadService.getDownloadLink(file.id, null);

    getDownloadLinkObservable.subscribe(response => {
      window.location.href = response.url;
    }, error => {
      console.log(error);
    });
  }

  downloadMultipleFiles() {
    const fileIdsToDownload = this.files.filter(f => f.checked).map(f => f.id);
    this.downloadService.getDownloadLink(null, fileIdsToDownload).subscribe(response => {
      window.location.href = response.url;
    }, error => {
      console.log(error);
    });
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
    if (file.fileStatus === FileStatus.Completed && !file.loading) {
      file.loading = true;
      this.http.put<any>(`${environment.apiUrl}/File/SetFavourite/${file.id}?value=${!file.isFavourite}`, {}).subscribe(() => {
        file.isFavourite = !file.isFavourite;
        file.loading = false;
      }, error => {
        console.log(error);
        file.loading = false;
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
        this.toastr.error(error.error, "Directory delete error");
      })
    } else {
      this.http.delete(`${environment.apiUrl}/File/Delete/${file.id}`).subscribe(() => {
        reload ? this.reloadData() : null;
        this.authenticationService.updateCurrentUserUsedSpace(-file.size);
        delete this.names[this.names.findIndex(x => x === file.fileName)];
      }, error => {
        this.toastr.error(error.error, "Directory delete error");
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
        if (error.error)
          this.toastr.error(error.error, "Copy error");
      })
  }

  hideOnSecondOpen(dropdown: any) {
    if (this.openDropdownToBeHidden && dropdown !== this.openDropdownToBeHidden) {
      this.openDropdownToBeHidden.hide();
    }
    this.openDropdownToBeHidden = dropdown;
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
        file.loading = true;
        let filename = this.fileNameForm.get('fileName')?.value;

        this.http.put(`${environment.apiUrl}/File/Rename/${file.id}?name=${filename}`, {}).subscribe(() => {
          file.fileName = filename;
          file.modificationDate = new Date();
          this.names.push(file.fileName);
          this.gRename = false;
          file.loading = false;
        }, error => {
          file.loading = false;
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
    const file = this.fileExplorerService.filesToShare[0];
    if (file.fileStatus === FileStatus.Completed && !file.loading) {
      file.loading = true;
      this.modalRef?.hide();
      const fileId = this.fileExplorerService.filesToShare[0].id;

      this.http.post<any>(`${environment.apiUrl}/Share/${fileId}/Add`, this.shareRequestBody).subscribe(() => {
        this.files.find(file => file.id === fileId)!.isShared = true;
        this.toastr.success("Share added", "Share status")
        this.fileExplorerService.filesToShare = [];
        this.shareRequestBody = {AccessMode: AccessMode.ReadOnly};
        file.loading = false;
      }, error => {
        this.toastr.error(error.error, "Share error")
        this.fileExplorerService.filesToShare = [];
        this.shareRequestBody = {AccessMode: AccessMode.ReadOnly};
        file.loading = false;
      });
    }
  }

  shareDecline() {
    this.modalRef?.hide();
    this.fileExplorerService.filesToShare = [];
    //Tutaj
    this.shareRequestBody = {AccessMode: AccessMode.ReadOnly};
  }

  deleteShare(share: ShareResponse){
    this.http.delete<any>(`${environment.apiUrl}/Share/Delete/${share.shareId}`).subscribe(() => {
      this.shares = this.shares.filter(item => item !== share);
      if(this.shares.length == 0){
        this.modalRef?.hide();
        this.reloadData();
      }
    }, error => {
      this.toastr.error(error.error, "Share removal error");
      this.modalRef?.hide();
    });
  }

  shareGetItemAccessMode(shareType: string) {
    switch (shareType) {
      case "read":
        return AccessMode.ReadOnly;
      case "write":
        return AccessMode.ReadWrite;
      case "full":
        return AccessMode.FullAccess;
      default:
        return AccessMode.ReadOnly;
    }
  }

  getAccessModeNameFromNumber(shareType: number) {
    switch (shareType) {
      case 0:
        return 'Read only';
      case 1:
        return 'Read write';
      case 2:
        return 'Full access';
      default:
        return 'Read only';
    }
  }

  generateShareLink(file: File) {
    const getDownloadLinkObservable = file.isDirectory
      ? this.downloadService.getDownloadLink(null, [file.id])
      : this.downloadService.getDownloadLink(file.id, null);

    getDownloadLinkObservable.subscribe(response => {
      navigator.clipboard.writeText(response.url).then().catch(e => this.toastr.error(e));
      this.toastr.success("Share link has been successfully copied to your clipboard")
    }, error => {
      console.log(error);
    });
  }

  isEllipsisActive(e: any) {
    return (e.offsetWidth < e.scrollWidth);
  }
}
