import {Directive, EventEmitter, HostBinding, HostListener, Output} from '@angular/core';

@Directive({
  selector: '[appDnd]'
})
export class DndDirective {
  @HostBinding('class.fileOver') fileOver: boolean = false;
  @Output() dropped = new EventEmitter<File[]>();

  @HostListener('dragover', ['$event']) onDragOver($event: any) {
    $event.preventDefault();
    $event.stopPropagation();
    this.fileOver = true;
  }

  @HostListener('dragleave', ['$event']) onDragLeave($event: any) {
    $event.preventDefault();
    $event.stopPropagation();
    this.fileOver = false;
  }

  @HostListener('drop', ['$event'])
  async onDrop($event: DragEvent) {
    $event.preventDefault();
    $event.stopPropagation();
    if ($event.dataTransfer === null) return;
    this.dropped.emit(await this.getAllFileEntries($event.dataTransfer.items));
    this.fileOver = false;
  }

  // Drop handler function to get all files
  private async getAllFileEntries(dataTransferItemList: DataTransferItemList): Promise<File[]> {
    let fileEntries = [];
    let queue = [];
    for (let i = 0; i < dataTransferItemList.length; i++) {
      queue.push(dataTransferItemList[i].webkitGetAsEntry());
    }
    while (queue.length > 0) {
      let entry = queue.shift();
      if (entry.isFile) {
        fileEntries.push(entry);
      } else if (entry.isDirectory) {
        queue.push(
          ...(await this.readAllDirectoryEntries(entry.createReader()))
        );
      }
    }
    let files: File[] = [];
    for (let i = 0; i < fileEntries.length; i++) {
      const fEntry = fileEntries[i];
      files.push(await this.getFile(fEntry));
    }
    return files;
  }

  // Get all the entries (files or sub-directories) in a directory
  private async readAllDirectoryEntries(directoryReader: any) {
    let entries = [];
    let readEntries: any = await this.readEntriesPromise(directoryReader);
    while (readEntries.length > 0) {
      entries.push(...readEntries);
      readEntries = await this.readEntriesPromise(directoryReader);
    }
    return entries;
  }

  // Wrap readEntries in a promise to make working with readEntries easier
  // readEntries will return only some of the entries in a directory
  private async readEntriesPromise(directoryReader: any) {
    try {
      return await new Promise((resolve, reject) => {
        directoryReader.readEntries(resolve, reject);
      });
    } catch (err) {
      console.log(err);
    }
  }

  private async getFile(fileEntry: any): Promise<File> {
    const file: File = await new Promise((resolve, reject) =>
      fileEntry.file(resolve, reject));

    function isInSubfolder(fileEntry: any) {
      let path = fileEntry.fullPath;
      const re = new RegExp('/', 'g');
      return path.match(re).length > 1;
    }

    if(isInSubfolder(fileEntry))
      Object.defineProperty(file, 'webkitRelativePath', {
        value: fileEntry.fullPath
      })
    return file;
  }
}
