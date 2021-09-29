import {Component, OnInit} from '@angular/core';
import {FileUploaderService} from "../../services/file-uploader.service";

@Component({
  selector: 'app-file-upload',
  templateUrl: './file-upload.component.html',
  styleUrls: ['./file-upload.component.scss']
})
export class FileUploadComponent implements OnInit {

  constructor(private fileUploader: FileUploaderService) {
  }

  ngOnInit(): void {
  }

  public fileSelected(target: EventTarget | null) {
    const fileElement = target as HTMLInputElement;
    if (fileElement == null ||
      fileElement.files == null ||
      fileElement.files.length <= 0) {
      return;
    }
    this.fileUploader.upload(fileElement.files[0]);
  }

}
