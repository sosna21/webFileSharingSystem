import {Component, OnInit} from '@angular/core';
import {FileUploader} from "ng2-file-upload";
import {environment} from "../../../environments/environment";
import {AuthenticationService} from "../../services/authentication.service";
import {SizeConverterPipe} from "../common/sizeConverterPipe";

@Component({
  selector: 'app-sidebar',
  templateUrl: './sidebar.component.html',
  styleUrls: ['./sidebar.component.scss']
})
export class SidebarComponent implements OnInit {
  uploader!: FileUploader;
  hasBaseDropzoneOver = false;
  baseUrl = environment.apiUrl;
  usedSpace: number = 0;
  quota: number = 0;

  isShareItemActive: boolean = false;

  constructor(private authenticationService: AuthenticationService) {
  }

  ngOnInit(): void {
    this.authenticationService.currentUser.subscribe(user => {
      this.usedSpace = user.usedSpace;
      this.quota = user.quota;
    });
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
    this.uploader.onAfterAddingFile = (file) => {
      file.withCredentials = false;
    }

    this.uploader.onSuccessItem = (item, response, status, headers) => {
      if (response) {
        const file = JSON.parse(response);
        //this.member.files.push(file)
      }
    }
  }

  toggleShareItemActive(): void {
    this.isShareItemActive = !this.isShareItemActive;
  }

  getQuota() {
    let quota = new SizeConverterPipe().transform(this.quota)
    return this.quota === 0 ? null : ` \\ ${quota}`
  }
}
