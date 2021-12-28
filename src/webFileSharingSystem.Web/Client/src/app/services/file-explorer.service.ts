import { Injectable } from '@angular/core';
import {File} from "../Components/common/file";
import {BehaviorSubject} from "rxjs";


@Injectable({
  providedIn: 'root'
})
export class FileExplorerService {
  public filesToMoveCopy: File[] = [];
  public filesToDelete: File[] = [];
  public filesToShare: File[] = [];

  private parentIdSource = new BehaviorSubject<number | null>(null);
  public parentId = this.parentIdSource.asObservable();

  private searchedTextSource = new BehaviorSubject<string | null>(null);
  public searchedText = this.searchedTextSource.asObservable();

  public get currentParentIdValue(): number | null {
    return this.parentIdSource.value;
  }


  constructor() { }

  public updateParentId(parentId: number | null){
    this.parentIdSource.next(parentId);
  }

  public updateSearchText(searchedPhrase: string){
    this.searchedTextSource.next(searchedPhrase);
  }
}
