import {Component, Input, OnInit} from '@angular/core';
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
  stopped: boolean;
}

@Component({
  selector: 'app-file-explorer',
  templateUrl: './file-explorer.component.html',
  styleUrls: ['./file-explorer.component.scss']
})
export class FileExplorerComponent implements OnInit {
  @Input() mode: string = 'GetAll';
  @Input() title: string = 'All Files';
  fileNameForm!: FormGroup;
  files: File[] = [];
  itemsPerPage = 15;
  currentPage = 1;
  totalItems!: number;
  gRename: boolean = false;
  names: string[] = [];
  patch: string[] = [];

  constructor(private http: HttpClient, private formBuilder: FormBuilder,) {
  }

  private openDropdownToBeHidden: any;

  ngOnInit(): void {
    this.getFiles(this.mode);
    this.initializeForm();
  }

  selectDir(file: File) {
    if (file.isDirectory) {
      this.patch.push(file.fileName);
      this.getFiles(this.mode, file.id);
      console.log(`Directory changed to: ${file.fileName}`)
    }

  }

  initializeForm() {
    this.fileNameForm = this.formBuilder.group({
      dirName: ['', [Validators.required, this.checkNameUnique()]],
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

  getFiles(mode: string, parentId: number = -1): void {
    this.http.get<any>(`${environment.apiUrl}/File/${mode}?PageNumber=${this.currentPage}&PageSize=${this.itemsPerPage}&ParentId=${parentId}`).subscribe(response => {
      this.totalItems = response.totalCount;
      this.files = response.items;
      this.names = this.files.map(x => x.fileName);
      this.files.forEach(x => x.isCompleted = Math.random() > 0.15);
      this.files.filter(x => !x.isCompleted).forEach(x => x.stopped = Math.random() > 0.5);
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
    this.getFiles(this.mode)
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
      this.getFiles(this.mode);
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
      this.files.pop();
      let name = this.fileNameForm.get('dirName')?.value;
      this.http.post<any>(`${environment.apiUrl}/File/CreateDir/${name}`, {}).subscribe(response => {
        let file: File = response;

        file.checked = false;
        file.rename = false;
        file.isCompleted = true;
        file.stopped = false;

        this.files.unshift(file)
        this.names.push(file.fileName);

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

  initDirCreat(form: any) {
    if (!this.gRename) {
      this.fileNameForm.reset();
      this.fileNameForm.markAsUntouched();
      this.gRename = true;
      form.hidden = false;
    }
  }

  stopUpload(file: File) {
    file.stopped = true;
  }

  continueUpload(file: File) {
    file.stopped = false;
  }
}
