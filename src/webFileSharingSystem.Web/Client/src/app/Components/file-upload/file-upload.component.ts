import {Component, OnDestroy, OnInit} from '@angular/core';
import {FileUploaderService} from "../../services/file-uploader.service";
import {Router} from "@angular/router";

@Component({
  selector: 'app-file-upload',
  templateUrl: './file-upload.component.html',
  styleUrls: ['./file-upload.component.scss']
})
export class FileUploadComponent implements OnInit, OnDestroy {
  parentId: number | null = null;

  constructor(private fileUploader: FileUploaderService, private route: Router) {
  }

  ngOnInit(): void {

  }

  ngOnDestroy(): void {
  }

  public fileSelected(target: EventTarget | null) {
    let id = this.route.url.split('/').pop()
    if(id)this.parentId = +id
    const fileElement = target as HTMLInputElement;
    if (fileElement == null ||
      fileElement.files == null ||
      fileElement.files.length <= 0) {
      return;
    }
    this.fileUploader.upload(fileElement.files[0],this.parentId);
  }



}
