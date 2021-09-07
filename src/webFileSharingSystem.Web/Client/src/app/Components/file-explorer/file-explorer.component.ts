import { Component, OnInit } from '@angular/core';
import {HttpClient} from "@angular/common/http";
import { Observable } from 'rxjs';

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

  baseUrl = 'https://localhost:5001/';
  files: File[] = [];

  constructor(private http: HttpClient) { }

  ngOnInit(): void {
    //var observableFiles = this.files.asObservable();
    this.http.get<File[]>(this.baseUrl + 'File').subscribe(response => {
      this.files = response;
     }, error => {
       console.log(error)
     })
  }

}
