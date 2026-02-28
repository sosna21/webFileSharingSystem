import {Component, ElementRef, OnDestroy, OnInit, TemplateRef, ViewChild} from '@angular/core';
import {File} from "../common/file";
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

@Component({
  selector: 'app-files-shared-with-me-explorer',
  templateUrl: './files-shared-with-me-explorer.component.html',
  styleUrls: ['./files-shared-with-me-explorer.component.scss']
})

export class FilesSharedWithMeExplorerComponent implements OnInit, OnDestroy {
  @ViewChild("fileUpload", {static: false}) fileUpload: ElementRef | undefined;
  loadingData: boolean = true;
  parentId: number | null = null;
  fileNameForm!: FormGroup;
  sharedFiles: SharedFile[] = [];
  itemsPerPage = 15;
  currentPage = 1;
  totalItems!: number;
  names: string[] = [];
  searchedPhrase: string | null = null;
  breadCrumbs: BreadCrumb[] = [];
  modalRef?: BsModalRef;
  maxDate = '9999-12-31T23:59:59.9999999'

  private subscriptions: Subscription[] = []
  private openDropdownToBeHidden: any;

  constructor(private http: HttpClient, private downloadService: DownloadService, public fileExplorerService: FileExplorerService, private modalService: BsModalService,
              private authenticationService: AuthenticationService, private toastr: ToastrService, private uploadService: FileUploaderService, private formBuilder: FormBuilder,
              private route: ActivatedRoute
  ) {
  }

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
        if (reloadSearchWhenEmpty || (response && response !== '')) {
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
    // this.toastr.toastrConfig.preventDuplicates = true;
  }

  ngOnDestroy(): void {
    this.subscriptions.forEach((subscription) => subscription.unsubscribe());
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
    this.getFiles(this.parentId, this.searchedPhrase);
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

  getFiles(parentId: number | null, searchedPhrase: string | null, callBack?: () => void): void {
    this.http.get<any>(`${environment.apiUrl}/Share/GetSharedWithMe?PageNumber=${this.currentPage}&PageSize=${this.itemsPerPage}
      ${parentId ? '&ParentId=' + parentId : ''}${(searchedPhrase && searchedPhrase !== '') ? '&SearchedPhrase=' + searchedPhrase : ''}`)
      .subscribe(response => {
        this.loadingData = false;
        this.totalItems = response.totalCount;
        this.sharedFiles = response.items;
        callBack?.();
      }, error => {
        this.loadingData = false;
        this.toastr.error(error.error, "File load error");
      })
  }

  getNames(): void {
    let parentId = this.parentId ?? -1;
    this.http.get<any>(`${environment.apiUrl}/Share/GetNames/${parentId}`).subscribe(response => {
      this.names = response;
    }, error => {
      this.toastr.error(error.error, "File load error");
    })
  }

  getFilePath(fileId: number) {
    this.http.get<any>(`${environment.apiUrl}/File/GetFilePath/${fileId}`).subscribe(response => {
      this.breadCrumbs = response;
    }, error => {
      this.toastr.error(error.error, "File load error");
    })
  }

  downloadFile(file: File) {
    const getDownloadLinkObservable = file.isDirectory
      ? this.downloadService.getDownloadLink(null, [file.id])
      : this.downloadService.getDownloadLink(file.id, null);

    getDownloadLinkObservable.subscribe(response => {
      window.location.href = response.url;
    }, error => {
      this.toastr.error(error.error, "File download error");
    });
  }

  downloadMultipleFiles() {
    const fileIdsToDownload = this.sharedFiles.filter(f => f.checked).map(f => f.id);
    this.downloadService.getDownloadLink(null, fileIdsToDownload).subscribe(response => {
      window.location.href = response.url;
    }, error => {
      this.toastr.error(error.error, "Files download error");
    });
  }

  checkAllCheckBox(ev: any) {
    this.sharedFiles.forEach(x => x.checked = ev.target.checked)
  }

  isAllCheckBoxChecked() {
    if (this.sharedFiles.length > 0)
      return this.sharedFiles.every(file => file.checked)
    return false
  }

  isManyCheckboxesChecked(): boolean {
    return this.sharedFiles.filter(x => x.checked).length > 1;
  }

  markCheckedFiles() {
    this.fileExplorerService.filesToDelete = this.sharedFiles.filter(x => x.checked);
  }

  pageChanged(event: any) {
    this.currentPage = event.page;
    this.reloadData();
  }

  deleteFile(file: File, reload: boolean = true) {
    if (file.isDirectory) {
      this.http.delete(`${environment.apiUrl}/File/DeleteDir/${file.id}`).subscribe(() => {
        reload ? this.reloadData() : null;
        delete this.names[this.names.findIndex(x => x === file.fileName)];
      }, error => {
        this.toastr.error(error.error, "Directory delete error");
      })
    } else {
      this.http.delete(`${environment.apiUrl}/File/Delete/${file.id}`).subscribe(() => {
        reload ? this.reloadData() : null;
        delete this.names[this.names.findIndex(x => x === file.fileName)];
      }, error => {
        this.toastr.error(error.error, "File delete error");
      })
    }
  }

  removeShare(sharedFile?: SharedFile) {
    if (sharedFile && !sharedFile.shareId) {
      return;
    }
    let files: SharedFile[];
    if (sharedFile === undefined)
      files = this.sharedFiles.filter(file => file.checked);
    else
      files = [sharedFile];

    files.some((file, index, array) => {
      if (!file.shareId) {
        this.toastr.error("To delete some shares you must delete whole shared folder", "Share remove error")
        return;
      }
      this.http.delete(`${environment.apiUrl}/Share/Delete/${file.shareId}`).subscribe(() => {
        if (index == array.length - 1) {
          this.reloadData();
        }
        delete this.names[this.names.findIndex(x => x === file.fileName)];
        this.toastr.success("Share removed successfully", "Share remove status");
      }, error => {
        this.toastr.error(error.error, "Share remove error");
      });
    })
  }

  isMoveCopyAllowed(): boolean {
    if (!this.parentId) {
      return false;
    }

    if (this.fileExplorerService.lastStoredSharedFile?.id === this.parentId) {
      return this.fileExplorerService.lastStoredSharedFile.accessMode > AccessMode.ReadOnly;
    }

    return true;
  }

  moveCopyInit(file?: File) {
    var filesToMoveCopy: File[];
    if (file) {
      filesToMoveCopy = [file];
    } else {
      filesToMoveCopy = this.sharedFiles.filter(x => x.checked);
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

  canCreateDirectory(): boolean {
    if (!this.parentId) {
      return false;
    }

    if (this.fileExplorerService.lastStoredSharedFile?.id === this.parentId) {
      return this.fileExplorerService.lastStoredSharedFile.accessMode > AccessMode.ReadOnly;
    }

    return true;
  }

  initDirCreate(form: any) {
    this.fileNameForm.get('dirName')?.setValue(this.findUniqueDirName());
    form.hidden = false;
  }

  findUniqueDirName(): string {
    let dirName = "New folder";
    let counter = 0;
    while (this.names.includes(dirName)) {
      dirName = `New folder (${++counter})`
    }
    return dirName;
  }

  createDirectory() {
    if (!this.fileNameForm.get('dirName')?.invalid && this.parentId) {
      let name = this.fileNameForm.get('dirName')?.value;
      this.http.post<any>(`${environment.apiUrl}/File/CreateDir/${name}?parentId=${this.parentId}`, {}).subscribe((response: File) => {
        //TODO resolve locally
        this.names.push(name);
        this.reloadData();
      }, error => {
        this.toastr.error(error.error ? error.error
          : 'Something went wrong while creating directory', 'Directory creation error')
      });
    }
  }

  renameInit(file: File) {
    this.names = this.names.filter(x => x !== file.fileName);
    this.fileNameForm.get('fileName')?.patchValue(file.fileName);
    file.rename = true;
  }

  rename(file: File, renameInput: HTMLTableDataCellElement) {
    if (file.loading) return;

    if (!this.fileNameForm.get('fileName')?.invalid) {
      file.loading = true;
      let filename = this.fileNameForm.get('fileName')?.value;
      this.http.put(`${environment.apiUrl}/File/Rename/${file.id}?name=${filename}`, {}).subscribe(() => {
        file.fileName = filename;
        file.modificationDate = (new Date().toISOString().slice(0, -1)) as unknown as Date;
        this.names.push(filename);
        file.loading = false;
      }, error => {
        file.loading = false;
        this.toastr.error(error.error, "Rename error");
      })
    } else if (!this.names.includes(file.fileName)) this.names.push(file.fileName);
    file.rename = false;
    renameInput.hidden = true;
  }

  minAccessModeInCheckedFiles() {
    return Math.min.apply(null, this.sharedFiles.filter(x => x.checked).map(file => file.accessMode));
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

  isEllipsisActive(e: any) {
    return (e.offsetWidth < e.scrollWidth);
  }

  convertToAngularUTC(date: Date) {
    return new Date(date + 'Z');
  }

  storeLastFile(shareFile: SharedFile) {
    this.fileExplorerService.lastStoredSharedFile = shareFile;
  }
}
