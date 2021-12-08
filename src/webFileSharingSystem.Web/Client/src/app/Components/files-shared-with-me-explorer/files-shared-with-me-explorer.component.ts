import {Component, ElementRef, OnInit, TemplateRef, ViewChild} from '@angular/core';
import {File, FileStatus, ProgressStatus} from "../common/file";
import {DownloadService} from "../../services/download.service";
import {FileExplorerService} from "../../services/file-explorer.service";
import {environment} from "../../../environments/environment";
import {HttpClient} from "@angular/common/http";
import {BsModalRef, BsModalService} from "ngx-bootstrap/modal";
import {AuthenticationService} from "../../services/authentication.service";
import {ToastrService} from "ngx-toastr";
import {FileUploaderService} from "../../services/file-uploader.service";
import {AbstractControl, FormBuilder, FormGroup, ValidatorFn, Validators} from "@angular/forms";
import {AccessMode, SharedFile} from '../common/sharedFile';
import {Subscription} from "rxjs";
import {ActivatedRoute} from "@angular/router";


interface BreadCrumb {
  id: number;
  fileName: string;
}

interface ShareRequestResponse {
  sharedWithUserName: string,
  accessMode: AccessMode,
  validUntil: Date
}

interface ShareRequestBody {
  UserNameToShareWith?: string,
  AccessMode?: AccessMode,
  AccessDuration?: any,
  Update?: boolean
}

@Component({
  selector: 'app-files-shared-with-me-explorer',
  templateUrl: './files-shared-with-me-explorer.component.html',
  styleUrls: ['./files-shared-with-me-explorer.component.scss']
})

export class FilesSharedWithMeExplorerComponent implements OnInit {
  files: SharedFile[] = [];
  private openDropdownToBeHidden: any;
  shares: ShareRequestResponse[] = [];
  modalRef?: BsModalRef;
  shareRequestBody: ShareRequestBody = {AccessMode: AccessMode.ReadOnly};
  parentId: number | null = null;
  parentAccessMode: AccessMode  = AccessMode.ReadOnly;
  itemsPerPage = 15;
  currentPage = 1;
  totalItems!: number;
  ProgressStatus = ProgressStatus;
  searchedPhrase: string | null = null;
  names: string[] = [];
  @ViewChild("fileUpload", {static: false}) fileUpload: ElementRef | undefined;
  gRename: boolean = false;
  fileNameForm!: FormGroup;
  breadCrumbs: BreadCrumb[] = [];
  loadingData: boolean = true;
  maxDate = '9999-12-31T23:59:59.9999999'
  userSubscription!: Subscription;


  constructor(private http: HttpClient, private downloadService: DownloadService, public fileExplorerService: FileExplorerService, private modalService: BsModalService,
              private authenticationService: AuthenticationService, private toastr: ToastrService, private uploadService: FileUploaderService, private formBuilder: FormBuilder,
              private route: ActivatedRoute
  ) {
  }

  ngOnInit(): void {
    this.userSubscription = this.route.params.subscribe(params => {

      if (params['id']) {
        this.parentId = +params['id'];
      }
      let reloadSearchWhenEmpty = false;
      this.fileExplorerService.searchedText.subscribe(response => {
        this.searchedPhrase = response;
        if (reloadSearchWhenEmpty || (response && response !== '')) {
          this.reloadData();
          reloadSearchWhenEmpty = true;
        }
      })

      this.reloadData();
      this.getNames();
      if (this.parentId)
        this.getFilePath(this.parentId);
    });

    this.initializeForm();
    this.toastr.toastrConfig.preventDuplicates = true;
  }


  getFilePath(fileId: number) {
    this.http.get<any>(`${environment.apiUrl}/File/GetFilePath/${fileId}`).subscribe(response => {
      this.breadCrumbs = response;
      console.log(this.breadCrumbs);
    }, error => {
      console.log(error);
    })
  }

  isAllCheckBoxChecked() {
    if (this.files.length > 0)
      return this.files.every(file => file.checked)
    return false
  }

  checkAllCheckBox(ev: any) {
    this.files.forEach(x => x.checked = ev.target.checked)
  }

  isManyCheckboxesChecked(): boolean {
    return this.files.filter(x => x.checked).length > 1;
  }

  hideOnSecondOpen(dropdown: any) {
    if (this.openDropdownToBeHidden && dropdown !== this.openDropdownToBeHidden) {
      this.openDropdownToBeHidden.hide();
    }
    this.openDropdownToBeHidden = dropdown;
    console.log(dropdown);
  }

  downloadMultipleFiles() {
    const fileIdsToDownload = this.files.filter(f => f.checked).map(f => f.id);
    return this.downloadService.downloadMultipleFilesDirectUrl(fileIdsToDownload);
  }

  minAccessModeInCheckedFiles(){
    return Math.min.apply(null, this.files.filter(x => x.checked).map(file => file.accessMode));
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

  openModal(template: TemplateRef<any>) {
    this.modalRef = this.modalService.show(template, {class: 'modal-dialog-centered modal-md'});
  }

  markCheckedFiles() {
    this.fileExplorerService.filesToDelete = this.files.filter(x => x.checked);
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

  private reloadData(): void {
    this.getFiles(this.parentId, this.searchedPhrase);
  }

  getFiles(parentId: number | null, searchedPhrase: string | null, callBack?: () => void): void {
    this.http.get<any>(`${environment.apiUrl}/File/GetSharedWithMe?PageNumber=${this.currentPage}&PageSize=${this.itemsPerPage}
      ${parentId ? '&ParentId=' + parentId : ''}${(searchedPhrase && searchedPhrase !== '') ? '&SearchedPhrase=' + searchedPhrase : ''}`)
      .subscribe(response => {
        this.loadingData = false;
        this.totalItems = response.totalCount;
        const parentFile = this.files.find(file => file.id === parentId);
        this.parentAccessMode = AccessMode.ReadOnly;
        if(parentFile !== undefined) this.parentAccessMode = parentFile.accessMode
        this.files = response.items;
        this.files.forEach(x => x.progressStatus = ProgressStatus.Stopped);
        callBack?.();
      }, error => {
        this.loadingData = false;
        console.log(error);
      })
  }

  isCompleted(file: File): boolean {
    return file.fileStatus === FileStatus.Completed;
  }


  cancelUpload(file: File) {
    this.uploadService.cancel(file.id);
    this.deleteFile(file, false);
    this.files = this.files.filter(x => x != file);
  }


  removeShare(files?: File[]) {

    if(files === undefined) files = this.files.filter(file => file.checked);
    files.some((file, index, array) => {
      this.http.delete(`${environment.apiUrl}/Share/RemoveShare/${file.id}`).subscribe(() => {
        if (index == array.length - 1) {
          this.reloadData();
        }
        delete this.names[this.names.findIndex(x => x === file.fileName)];
        this.toastr.success("Share removed successfully","Share remove status");
      }, error => {
        //TODO break forEach
        this.toastr.error(error.error,"Share remove error");
      });
    })
  }

  deleteFile(file: File, reload: boolean = true) {
    if (file.isDirectory) {
      this.http.delete(`${environment.apiUrl}/Share/DeleteDir/${file.id}`).subscribe(() => {
        reload ? this.reloadData() : null;
        delete this.names[this.names.findIndex(x => x === file.fileName)];
      }, error => {
        this.toastr.error(error.error, "Directory delete error");
      })
    } else {
      this.http.delete(`${environment.apiUrl}/Share/DeleteFile/${file.id}`).subscribe(() => {
        reload ? this.reloadData() : null;
        delete this.names[this.names.findIndex(x => x === file.fileName)];
      }, error => {
        this.toastr.error(error.error, "File delete error");
      })
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


  stopUpload(file: File) {
    if (file.progressStatus === ProgressStatus.Started) {
      file.progressStatus = ProgressStatus.Stopping;
      this.uploadService.pause(file.id);
    }
  }


  rename(file: File) {
    if (this.gRename) {
      this.gRename = false;
      if (!this.fileNameForm.get('fileName')?.invalid) {
        let filename = this.fileNameForm.get('fileName')?.value;

        this.http.put(`${environment.apiUrl}/Share/Rename/${file.id}?name=${filename}`, {}).subscribe(() => {
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

  downloadFile(file: File) {
    return file.isDirectory
      ? this.downloadService.downloadMultipleFilesDirectUrl([file.id])
      : this.downloadService.downloadSingleFileDirectUrl(file.id);
  }

  renameInit(file: File) {
    if (!this.gRename) {
      delete this.names[this.names.findIndex(x => x === file.fileName)];
      this.fileNameForm.get('fileName')?.patchValue(file.fileName);
      this.fileNameForm.markAsTouched();
      file.rename = this.gRename = true;
    }
  }

  pageChanged(event: any) {
    this.currentPage = event.page;
    this.reloadData();
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

  getNames(): void {
    let parentId = this.parentId ?? -1;
    this.http.get<any>(`${environment.apiUrl}/Share/GetNames/${parentId}`).subscribe(response => {
      this.names = response;
    }, error => {
      console.log(error);
    })
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
    if (!this.fileNameForm.get('dirName')?.invalid && this.parentId) {

      let name = this.fileNameForm.get('dirName')?.value;
      let parentFile = this.files.find(file => file.id == this.parentId);
      this.http.post<any>(`${environment.apiUrl}/Share/CreateDir/${name}?parentId=${this.parentId}`, {}).subscribe(() => {
        this.reloadData();
        this.gRename = false;
      }, error => {
        console.log(error)
        this.toastr.error(error.error ? error.error
          :'Something went wrong while creating directory','Directory creation error')
      });
    }
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
}
