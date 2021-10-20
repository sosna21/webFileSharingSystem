import {Component, OnInit} from '@angular/core';
import {FileUploaderService} from "../../services/file-uploader.service";
import {Router} from "@angular/router";
import {from} from "rxjs";
import {concatMap, last, map} from "rxjs/operators";

@Component({
  selector: 'app-file-upload',
  templateUrl: './file-upload.component.html',
  styleUrls: ['./file-upload.component.scss']
})
export class FileUploadComponent implements OnInit {
  parentId: number | null = null;
  radioModel = 'files';

  constructor(private fileUploader: FileUploaderService, private route: Router) {
  }

  ngOnInit(): void {
  }

  public fileSelected(target: EventTarget | null) {
    let id = this.route.url.split('/').pop()
    if (id) this.parentId = +id
    const fileElement = target as HTMLInputElement;
    if (fileElement == null ||
      fileElement.files == null ||
      fileElement.files.length <= 0) {
      return;
    }
    console.log(fileElement.files);
    if (this.radioModel === 'files') {
      for (let i = 0; i < fileElement.files.length; i++) {
        this.fileUploader.upload(fileElement.files[i], this.parentId).subscribe();
      }
    } else {

      //version1 Upload files at the same time
      from(fileElement.files).pipe(concatMap((element) => {
        // @ts-ignore
        let path = element.webkitRelativePath;
        return this.fileUploader.ensureDirectoryExists(path, this.parentId)?.pipe(
          map(leafFileId => this.fileUploader.upload(element, leafFileId).subscribe()))
      })).pipe(last()).subscribe();


      // //version2 Upload files one by one
      // from(fileElement.files).pipe(concatMap((element) => {
      //   // @ts-ignore
      //   let path = element.webkitRelativePath;
      //   return this.fileUploader.ensureDirectoryExists(path, this.parentId)?.pipe(
      //     concatMap(leafFileId => this.fileUploader.upload(element, leafFileId)))
      // })).pipe(last()).subscribe();
    }
  }
}
