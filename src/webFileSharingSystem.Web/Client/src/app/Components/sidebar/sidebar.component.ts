import { Component, OnInit } from '@angular/core';
import {FileUploader} from "ng2-file-upload";
import {environment} from "../../../environments/environment";

@Component({
  selector: 'app-sidebar',
  templateUrl: './sidebar.component.html',
  styleUrls: ['./sidebar.component.scss']
})
export class SidebarComponent implements OnInit {
uploader!: FileUploader;
hasBaseDropzoneOver = false;
baseUrl = environment.apiUrl;

  constructor() { }

  ngOnInit(): void {
    this.initializeUploader();
  }

  isCollapsed = true;

  fileOverBase(e: any) {
    this.hasBaseDropzoneOver = e;
  }

  initializeUploader() {
    this.uploader = new FileUploader({
      url: this.baseUrl + 'users/add-file',
      //authToken: 'Bearer ',
      isHTML5: true,
      removeAfterUpload: true,
      autoUpload: false

    });
    this.uploader.onAfterAddingFile=(file) => {
      file.withCredentials = false;
    }

    this.uploader.onSuccessItem = (item,response, status, headers) => {
      if(response) {
        const file = JSON.parse(response);
        //this.member.files.push(file)
      }
    }
  }
}
