import { Injectable } from '@angular/core';
import {File} from "../Components/common/file";


@Injectable({
  providedIn: 'root'
})
export class FileExplorerService {
  filesToMoveCopy: number[] = [];
  filesToDelete: File[] = [];

  constructor() { }
}
