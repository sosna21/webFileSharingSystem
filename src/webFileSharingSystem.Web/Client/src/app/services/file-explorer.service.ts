import { Injectable } from '@angular/core';
import {File} from "../Components/common/file";
import {BehaviorSubject} from "rxjs";


@Injectable({
  providedIn: 'root'
})
export class FileExplorerService {
  filesToMoveCopy: File[] = [];
  filesToDelete: File[] = [];
  filesToShare: File[] = [];

  private searchedTextSource = new BehaviorSubject<string | null>(null);
  public searchedText = this.searchedTextSource.asObservable();

  constructor() { }

  public updateSearchText(searchedPhrase: string){
    this.searchedTextSource.next(searchedPhrase);
    console.log(searchedPhrase);
  }
}
