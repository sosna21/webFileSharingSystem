import {Component, OnInit} from '@angular/core';
import {HttpClient} from "@angular/common/http";
import { environment } from "../../../environments/environment";
import {FormBuilder, FormGroup, Validators} from "@angular/forms";


interface File {
  id: number;
  fileName: string;
  modificationData: Date;
  size: number;
  isFavourite: boolean;
  isShared: boolean
  checked: boolean;
  isDirectory: boolean;
  rename: boolean;
}

@Component({
  selector: 'app-file-explorer',
  templateUrl: './file-explorer.component.html',
  styleUrls: ['./file-explorer.component.scss']
})
export class FileExplorerComponent implements OnInit {
  fileNameForm!: FormGroup;
  filesToView: File[] = [];
  files: File[] = [];
  itemsPerPage = 17;
  currentPage = 1;
  totalItems!: number;
  gRename: boolean = false;

  constructor(private http: HttpClient, private formBuilder: FormBuilder,) {
  }

  ngOnInit(): void {
    this.getFiles();
    this.fileNameForm = this.formBuilder.group({
      fileName: ['', Validators.required]
    });
  }

  getFiles(): void {
    this.http.get<File[]>(`${environment.apiUrl}/File`).subscribe(files => {
      this.totalItems = files.length;
      this.files = files;
      this.filesToView = files.slice(0, this.itemsPerPage);
    }, error => {
      console.log(error)
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
    this.reloadFiles();
  }

  pageChanged(event: any) {
    this.currentPage = event.page;
    this.reloadFiles();
  }

  reloadFiles() {
    this.filesToView = this.files.slice((this.currentPage - 1) * this.itemsPerPage,
      (this.currentPage - 1) * this.itemsPerPage + this.itemsPerPage);
  }

  convertToReadableFileSize(size: number) {
    if (size === 0) {
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
    this.files = this.files.filter(x => x !== file);
    this.reloadFiles();
  }

  //TODO implement
  changeDirectory() {
    console.log("change directory");
    return null;
  }

  createDirectory() {

    if (!this.gRename) {
      this.gRename = true;
      this.filesToView.pop();

      const file: File = {
        id: Math.max.apply(Math, this.files.map(function (file) {
          return file.id;
        })) + 1,
        fileName: "newDirectory",
        modificationData: new Date(),
        size: 0,
        isFavourite: false,
        isShared: false,
        checked: false,
        isDirectory: true,
        rename: true,
      };
      this.filesToView.unshift(file)
      console.log("create Dir");
    }
  }

  rename(file: File) {
    if (!this.fileNameForm.invalid) {
      file.fileName = this.fileNameForm.get('fileName')?.value;
      file.rename = false;
      this.fileNameForm.reset();
      console.log(this.fileNameForm.get('fileName')?.value);
      this.gRename = false;
    }
  }


}
