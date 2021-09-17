import { Component, OnInit } from '@angular/core';
import {HttpClient} from "@angular/common/http";
import { environment } from "../../../environments/environment";

interface File {
  fileName: string;
  modificationData: Date;
  size: number;
  isFavourite: boolean;
  isShared: boolean
}

@Component({
  selector: 'app-file-explorer',
  templateUrl: './file-explorer.component.html',
  styleUrls: ['./file-explorer.component.scss']
})
export class FileExplorerComponent implements OnInit {
  files: File[] = [];

  constructor(private http: HttpClient) { }

  ngOnInit(): void {
    //var observableFiles = this.files.asObservable();
    this.http.get<File[]>(`${environment.apiUrl}/File`).subscribe(response => {
      this.files = response;
     }, error => {
       console.log(error)
     })
  }

}
