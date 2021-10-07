import { Injectable } from '@angular/core';

@Injectable({
  providedIn: 'root'
})
export class FileExplorerService {
  filesToMoveCopy: number[] = [];

  constructor() { }
}
