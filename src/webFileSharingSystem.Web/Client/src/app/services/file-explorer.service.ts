import { Injectable } from '@angular/core';
import {File} from "../Components/common/file";


@Injectable({
  providedIn: 'root'
})
export class FileExplorerService {
  filesToMoveCopy: File[] = [];
  filesToDelete: File[] = [];
  filesToShare: File[] = [];

  constructor() { }
}
