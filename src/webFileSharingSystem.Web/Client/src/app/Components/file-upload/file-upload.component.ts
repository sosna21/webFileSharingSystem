import {Component, OnInit} from '@angular/core';
import {FileUploaderService} from "../../services/file-uploader.service";
import {concatMap, last, map, tap} from "rxjs/operators";
import {FileExplorerService} from "../../services/file-explorer.service";
import {from} from "rxjs";

@Component({
  selector: 'app-file-upload',
  templateUrl: './file-upload.component.html',
  styleUrls: ['./file-upload.component.scss']
})
export class FileUploadComponent implements OnInit {

  constructor(private fileUploader: FileUploaderService, private fileExplorerService: FileExplorerService) {
  }

  ngOnInit(): void {
  }

  async fileUpload(files: File[]) {
    const parentId = this.fileExplorerService.currentParentIdValue;

    //version1 Upload files at the same time
    from(files).pipe(concatMap((element) => {
      // @ts-ignore
      let path = element.webkitRelativePath;
      if (path === '') {
         return this.fileUploader.upload(element, parentId);
      } else {
        return this.fileUploader.ensureDirectoryExists(path, parentId)
          .pipe(tap(() => this.fileUploader.newDirectoryCreatedForUpload(parentId)))
          .pipe(map(leafFileId => this.fileUploader.upload(element, leafFileId).subscribe()))
      }
    })).pipe(last()).subscribe();

  }

  convertToFileList(target: EventTarget | null): File[] {
    const fileElement = target as HTMLInputElement;
    let files = fileElement.files;
    if (files === null) return [];
    let fileObjs: File[] = [];
    for (let index = 0; index < files.length; index++) {
      const file = files[index];
      fileObjs.push(file);
    }
    return fileObjs;
  }
}
