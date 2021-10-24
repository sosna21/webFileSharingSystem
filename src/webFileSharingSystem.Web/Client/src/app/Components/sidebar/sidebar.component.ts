import {Component, Input, OnInit} from '@angular/core';
import {FileUploader} from "ng2-file-upload";
import {environment} from "../../../environments/environment";
import {AuthenticationService} from "../../services/authentication.service";
import {SizeConverterPipe} from "../common/sizeConverterPipe";
import {Observable} from "rxjs";

@Component({
  selector: 'app-sidebar',
  templateUrl: './sidebar.component.html',
  styleUrls: ['./sidebar.component.scss']
})
export class SidebarComponent implements OnInit {
  @Input() toggleCollapsed: Observable<boolean> | undefined;
  uploader!: FileUploader;
  baseUrl = environment.apiUrl;
  usedSpace: number = 0;
  quota: number = 0;
  isCollapsed = true;
  isShareItemActive: boolean = false;
  dynamic = 0;
  type: 'bg-success' | 'bg-info' | 'bg-warning' | 'bg-danger' = 'bg-info';

  constructor(private authenticationService: AuthenticationService) {
  }

  ngOnInit(): void {
    this.authenticationService.currentUser.subscribe(user => {
      this.usedSpace = user.usedSpace;
      this.quota = user.quota;
      this.calculateProgressPercent();
    });
    this.initializeUploader();

    this.toggleCollapsed?.subscribe(response => {
      this.isCollapsed = response;
    });
  }

  calculateProgressPercent(): void {
    let value = Math.round(this.usedSpace/this.quota * 100);
    let type: 'bg-success' | 'bg-info' | 'bg-warning' | 'bg-danger';

    if (value < 25) {
      type = 'bg-success';
    } else if (value < 50) {
      type = 'bg-info';
    } else if (value < 75) {
      type = 'bg-warning';
    } else {
      type = 'bg-danger';
    }

    this.dynamic = value;
    this.type = type;
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
