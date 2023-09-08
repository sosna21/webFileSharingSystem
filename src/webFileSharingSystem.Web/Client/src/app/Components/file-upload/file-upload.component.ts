import {Component, OnInit} from '@angular/core';
import {FileUploaderService} from "../../services/file-uploader.service";
import {map, tap} from "rxjs/operators";
import {FileExplorerService} from "../../services/file-explorer.service";

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
    console.log(
      'Files are:',
      files.map((file) => file.name)
    );
    console.log(files);

    const relativeDirId = this.fileExplorerService.currentParentIdValue;
    files.forEach(file => {
      // @ts-ignore
      let path = file.webkitRelativePath;
      if (path === '') {
        this.fileUploader.upload(file, relativeDirId).subscribe();
      } else {
        this.fileUploader.ensureDirectoryExists(path, relativeDirId)
          .pipe(tap(() => this.fileUploader.newDirectoryCreatedForUpload(relativeDirId)))
          .pipe(map(leafFileId => this.fileUploader.upload(file, leafFileId).subscribe())).subscribe();
      }
    });
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
