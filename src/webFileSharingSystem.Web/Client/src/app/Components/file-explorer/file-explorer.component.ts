import {Component, OnInit} from '@angular/core';
import {HttpClient} from "@angular/common/http";
import {environment} from "../../../environments/environment";
import {AbstractControl, FormBuilder, FormGroup, ValidatorFn, Validators} from "@angular/forms";


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
  stooped: boolean;
}

@Component({
  selector: 'app-file-explorer',
  templateUrl: './file-explorer.component.html',
  styleUrls: ['./file-explorer.component.scss']
})
export class FileExplorerComponent implements OnInit {
  fileNameForm!: FormGroup;
  files: File[] = [];
  itemsPerPage = 15;
  currentPage = 1;
  totalItems!: number;
  gRename: boolean = false;
  names: string[] = [];

  constructor(private http: HttpClient, private formBuilder: FormBuilder,) {
  }

  private openDropdownToBeHidden: any;

  ngOnInit(): void {
    this.getFiles();
    this.initializeForm();

  }

  initializeForm() {
    this.fileNameForm = this.formBuilder.group({
      dirName: ['', [Validators.required, this.checkDirUnique()]],
      fileName: ['', [Validators.required, this.checkFileUnique()]]
    });
  }

  checkFileUnique(): ValidatorFn {
    return (control: AbstractControl): { [key: string]: any } | null => {
      const forbidden = control?.parent?.controls as any;
      return (forbidden)
        ? !(this.names.filter(x => x === control?.value).length > 1) ? null : {isUnique: true}
        : null;
    }
  }

  checkDirUnique(): ValidatorFn {
    return (control: AbstractControl): { [key: string]: any } | null => {
      const forbidden = control?.parent?.controls as any;

      return (forbidden)
        ? !this.names.includes(control?.value) ? null : {isUnique: true}
        : null;
    }
  }

  getFiles(): void {
    this.http.get<any>(`${environment.apiUrl}/File/GetAll?PageNumber=${this.currentPage}&PageSize=${this.itemsPerPage}`).subscribe(response => {
      this.totalItems = response.totalCount;
      this.files = response.items;
      this.names = this.files.map(x => x.fileName);
      this.files.forEach(x => x.isCompleted = Math.random() > 0.15);
      this.files.filter(x => !x.isCompleted).forEach(x => x.stooped = Math.random() > 0.5);
    }, error => {
      console.log(error);
    })
  }

  checkAllCheckBox(ev: any) {
    this.files.forEach(x => x.checked = ev.target.checked)
  }

  isAllCheckBoxChecked() {
    return this.files.every(file => file.checked)
  }

  deleteCheckedFiles() {
    this.files = this.files.filter(x => !x.checked)

  //  this.reloadFiles();
  }

  pageChanged(event: any) {
    this.currentPage = event.page;
    this.getFiles()
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

  deleteFile(file: File) {
    this.http.delete(`${environment.apiUrl}/File/Delete/${file.id}`).subscribe(() => {
      this.getFiles();
    }, error => {
      console.log(error)
    })
  }

  //TODO implement
  changeDirectory() {
    console.log("change directory");
    return null;
  }

  hideOnSecondOpen(dropdown: any) {
    if (this.openDropdownToBeHidden && dropdown !== this.openDropdownToBeHidden) {
      this.openDropdownToBeHidden.hide();
    }
    this.openDropdownToBeHidden = dropdown;
    console.log(dropdown);
  }

  createDirectory() {
    if (!this.fileNameForm.get('dirName')?.invalid) {
      let delFile = this.files.pop();
      const file: File = {
        id: Math.max.apply(Math, this.files.map(function (file) {
          return file.id;
        })) + 1,
        fileName: this.fileNameForm.get('dirName')?.value,
        modificationDate: new Date(),
        size: 0,
        isFavourite: false,
        isShared: false,
        checked: false,
        isDirectory: true,
        rename: false,
        isCompleted: true,
        stooped: false
      };
      this.files.unshift(file);
      this.files.unshift(file);
      delete this.files[this.files.findIndex(file => file === delFile)];
      this.gRename = false;
      this.names.push(this.fileNameForm.get('dirName')?.value);
    }
  }

  renameInit(file: File) {
    if (!this.gRename) {
      this.fileNameForm.get('fileName')?.patchValue(file.fileName);
      this.fileNameForm.markAsTouched();
      file.rename = this.gRename = true;
    }
  }

  rename(file: File) {
    if (!this.fileNameForm.get('fileName')?.invalid) {
      delete this.names[this.names.findIndex(x => x === file.fileName)];
      file.fileName = this.fileNameForm.get('fileName')?.value;
      this.fileNameForm.reset();
      this.names.push(file.fileName);
    }
    file.rename = false;
    this.gRename = false;
  }

  dirCreat(form: any) {
    if (!this.gRename) {
      this.fileNameForm.reset();
      this.fileNameForm.markAsUntouched();
    }
    this.gRename = true;
    form.hidden = false;
  }

  stopUpload(file: File) {
  file.stooped = true;
  }

  continueUpload(file: File) {
    file.stooped = false;
  }
}
