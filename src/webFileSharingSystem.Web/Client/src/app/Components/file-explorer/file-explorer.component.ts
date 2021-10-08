import {Component, Input, OnDestroy, OnInit, TemplateRef} from '@angular/core';
import {HttpClient} from "@angular/common/http";
import {environment} from "../../../environments/environment";
import {AbstractControl, FormBuilder, FormGroup, ValidatorFn, Validators} from "@angular/forms";
import {Subscription} from "rxjs";
import {ActivatedRoute} from "@angular/router";
import {FileExplorerService} from "../../services/file-explorer.service";
import {BsModalRef, BsModalService} from "ngx-bootstrap/modal";


interface File {
  id: number;
  fileName: string;
  mimeType?: string;
  size: number;
  isFavourite: boolean;
  isShared: boolean
  isDirectory: boolean;
  modificationDate: Date;

  checked: boolean;
  rename: boolean;
  isCompleted: boolean;
  stopped: boolean;
}

interface BreadCrumb {
  id: number;
  fileName: string;
}

@Component({
  selector: 'app-file-explorer',
  templateUrl: './file-explorer.component.html',
  styleUrls: ['./file-explorer.component.scss']
})
export class FileExplorerComponent implements OnInit, OnDestroy {
  @Input() mode: string = 'GetAll';
  @Input() title: string = 'All Files';
  parentId: number | null = null;
  fileNameForm!: FormGroup;
  files: File[] = [];
  itemsPerPage = 15;
  currentPage = 1;
  totalItems!: number;
  gRename: boolean = false;
  names: string[] = [];
  breadCrumbs: BreadCrumb[] = [];
  userSubscription!: Subscription;

  modalRef?: BsModalRef;

  constructor(private http: HttpClient, private formBuilder: FormBuilder, private route: ActivatedRoute, public fileExplorerService: FileExplorerService
    , private modalService: BsModalService) {
  }

  private openDropdownToBeHidden: any;

  ngOnInit(): void {

    this.userSubscription = this.route.params.subscribe(params => {
      if (params['id']) {
        this.parentId = +params['id'];
      }
      this.reloadData();
      this.getNames();
      if (this.parentId)
        this.getFilePath(this.parentId);
    });
    this.initializeForm();
  }

  ngOnDestroy(): void {
    this.userSubscription.unsubscribe();
  }

  openModal(template: TemplateRef<any>) {
    this.modalRef = this.modalService.show(template, {class:'modal-dialog-centered modal-md'});
  }

  confirm(): void {
    this.modalRef?.hide();

    for (let i = 0; i < this.fileExplorerService.filesToDelete.length-1; i++) {
      this.deleteFile(this.fileExplorerService.filesToDelete[i],false)
    }
    this.deleteFile(this.fileExplorerService.filesToDelete[this.fileExplorerService.filesToDelete.length-1],true);
  }

  decline(): void {
    this.modalRef?.hide();
  }


  private reloadData(): void {
    this.getFiles(this.mode, this.parentId);
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

  getFiles(mode: string, parentId: number | null): void {
    this.http.get<any>(`${environment.apiUrl}/File/${mode}?PageNumber=${this.currentPage}&PageSize=${this.itemsPerPage}&ParentId=${parentId ?? -1}`).subscribe(response => {
      this.totalItems = response.totalCount;
      this.files = response.items;
      this.files.forEach(x => x.isCompleted = true);
      //this.files.forEach(x => x.isCompleted = Math.random() > 0.15);
      //this.files.filter(x => !x.isCompleted).forEach(x => x.stopped = Math.random() > 0.5);
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
    if (file.isCompleted) {
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

  convertToReadableFileSize(size: number) {
    if (size <= 0) {
      return "0 B"
    }
    let units = ['B', 'kB', 'MB', 'GB', 'TB', 'PB', 'EB', 'ZB', 'YB']
    let i = Math.floor(Math.log(size) / Math.log(1024));
    return i === 0 ? (size / Math.pow(1024, i)).toFixed(0) + ' ' + units[i]
      : (size / Math.pow(1024, i)).toFixed(2) + ' ' + units[i];
  };

  isManyCheckboxesChecked(): boolean {
    return this.files.filter(x => x.checked).length > 1;
  }

  deleteFile(file: File, reload: boolean = true) {
      if (file.isDirectory) {
        this.http.delete(`${environment.apiUrl}/File/DeleteDir/${file.id}`).subscribe(() => {
          reload ? this.reloadData() : null;
          delete this.names[this.names.findIndex(x => x === file.fileName)];
        }, error => {
          console.log(error)
        })
      } else {
        this.http.delete(`${environment.apiUrl}/File/Delete/${file.id}`).subscribe(() => {
          reload ? this.reloadData() : null;
          delete this.names[this.names.findIndex(x => x === file.fileName)];
        }, error => {
          console.log(error)
        })
      }
  }


  moveCopyInit(file?: File) {
    var filesIds: number[];
    if (file) {
      filesIds = [file.id];
    } else {
      filesIds = this.files.filter(x => x.checked).map(x => x.id);
    }
    this.fileExplorerService.filesToMoveCopy = filesIds;
  }


  moveCopyFiles(copy: boolean, filesIds: number[] = this.fileExplorerService.filesToMoveCopy) {
    let parentId = this.parentId ?? -1;
    (copy ? this.http.post(`${environment.apiUrl}/File/Copy/${parentId}`, filesIds)
      : this.http.put(`${environment.apiUrl}/File/Move/${parentId}`, filesIds))
      .subscribe(() => {
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


  initDirCreat(form: any) {
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
        file.isCompleted = true;
        file.stopped = false;

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
    file.stopped = true;
  }

  continueUpload(file: File) {
    file.stopped = false;
  }
}
