import {Component, OnInit} from '@angular/core';
import {FileUploaderService} from "../../services/file-uploader.service";

@Component({
  selector: 'app-file-upload',
  templateUrl: './file-upload.component.html',
  styleUrls: ['./file-upload.component.scss']
})
export class FileUploadComponent implements OnInit {
  private uploadFile!: File;

  constructor(private fileUploader: FileUploaderService) {
  }

  ngOnInit(): void {
  }

  public fileChanged(target: EventTarget | null) {
    const fileElement = target as HTMLInputElement;
    if (fileElement == null ||
      fileElement.files == null ||
      fileElement.files.length <= 0) {
      return;
    }
    // the first file is set as upload target.
    this.uploadFile = fileElement.files[0];
  }

  public saveFile() {
    if (this.uploadFile == null) {
      return;
    }
    this.fileUploader.upload(this.uploadFile);
  }
}
