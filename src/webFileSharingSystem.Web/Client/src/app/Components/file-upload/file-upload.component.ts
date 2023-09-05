import {Component, OnInit} from '@angular/core';
import {FileUploaderService} from "../../services/file-uploader.service";
import {from} from "rxjs";
import {concatMap, last, map, tap} from "rxjs/operators";
import {FileExplorerService} from "../../services/file-explorer.service";
import {stringify} from "@angular/compiler/src/util";

@Component({
  selector: 'app-file-upload',
  templateUrl: './file-upload.component.html',
  styleUrls: ['./file-upload.component.scss']
})
export class FileUploadComponent implements OnInit {
  radioModel = 'files';
  isHovering: boolean;


  folderPath: string;

  constructor(private fileUploader: FileUploaderService, private fileExplorerService: FileExplorerService) {
  }

  ngOnInit(): void {
  }

  toggleHover(event: boolean) {
    this.isHovering = event;
  }

  convertToFileList(event): File[] {
    let files = event.target.files;
    let fileObjs = [];
    for (let index = 0; index < files.length; index++) {
      const file = files[index];
      fileObjs.push(file);
    }
    return fileObjs;
  }

  async onDrop(files: File[]) {
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
        // @ts-ignore
        let path = file.webkitRelativePath;
        this.fileUploader.ensureDirectoryExists(path, relativeDirId)
          .pipe(tap(() => this.fileUploader.newDirectoryCreatedForUpload(relativeDirId)))
          .pipe(map(leafFileId => this.fileUploader.upload(file, leafFileId).subscribe())).subscribe();
      }
    });
  }

  // public fileSelected(target: EventTarget | null) {
  //   const parentId = this.fileExplorerService.currentParentIdValue;
  //
  //   const fileElement = target as HTMLInputElement;
  //   if (fileElement == null ||
  //     fileElement.files == null ||
  //     fileElement.files.length <= 0) {
  //     return;
  //   }
  //
  //   if (this.radioModel === 'files') {
  //     for (let i = 0; i < fileElement.files.length; i++) {
  //       this.fileUploader.upload(fileElement.files[i], parentId).subscribe();
  //     }
  //   } else {
  //     //version1 Upload files at the same time
  //     from(fileElement.files).pipe(concatMap((element) => {
  //       // @ts-ignore
  //       let path = element.webkitRelativePath;
  //       return this.fileUploader.ensureDirectoryExists(path, parentId)
  //         .pipe(tap(() => this.fileUploader.newDirectoryCreatedForUpload(parentId)))
  //         .pipe(map(leafFileId => this.fileUploader.upload(element, leafFileId).subscribe()))
  //     })).pipe(last()).subscribe();
  //
  //     // //version2 Upload files one by one
  //     // from(fileElement.files).pipe(concatMap((element) => {
  //     //   // @ts-ignore
  //     //   let path = element.webkitRelativePath;
  //     //   return this.fileUploader.ensureDirectoryExists(path, parentId)
  //     //     .pipe(tap(() => this.fileUploader.newDirectoryCreatedForUpload(parentId)))
  //     //     .pipe(concatMap(leafFileId => this.fileUploader.upload(element, leafFileId)))
  //     // })).pipe(last()).subscribe();
  //   }
  // }
}
