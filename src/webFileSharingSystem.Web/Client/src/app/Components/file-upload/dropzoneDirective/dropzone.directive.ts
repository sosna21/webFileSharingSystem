import { Directive, Output, EventEmitter, HostListener } from '@angular/core';

@Directive({
  selector: '[dropzone]',
})
export class DropzoneDirective {
  @Output() dropped = new EventEmitter<File[]>();
  @Output() hovered = new EventEmitter<boolean>();

  // hostlistener to intercept drop event in the DOM
  @HostListener('drop', ['$event'])
  async onDrop($event: DragEvent) {
    $event.preventDefault();
    this.dropped.emit(await this.getAllFileEntries($event.dataTransfer.items));
    this.hovered.emit(false);
  }
  @HostListener('dragover', ['$event'])
  onDragOver($event) {
    $event.preventDefault();
    this.hovered.emit(true);
  }
  @HostListener('dragleave', ['$event'])
  onDragLeave($event) {
    $event.preventDefault();
    this.hovered.emit(false);
  }

  // Drop handler function to get all files
  private async getAllFileEntries(
    dataTransferItemList: DataTransferItemList
  ): Promise<File[]> {
    let fileEntries = [];
    // Use BFS to traverse entire directory/file structure
    let queue = [];
    // Unfortunately dataTransferItemList is not iterable i.e. no forEach
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
    // console.log('file entries are:', files);
    return files;
  }

  // Get all the entries (files or sub-directories) in a directory
  // by calling readEntries until it returns empty array
  private async readAllDirectoryEntries(directoryReader) {
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
  // e.g. Chrome returns at most 100 entries at a time
  private async readEntriesPromise(directoryReader) {
    try {
      return await new Promise((resolve, reject) => {
        directoryReader.readEntries(resolve, reject);
      });
    } catch (err) {
      console.log(err);
    }
  }
  // @ts-ignore
  private async getFile(fileEntry): Promise<File> {
    try {
      return await new Promise((resolve, reject) =>
        fileEntry.file(resolve, reject)
      );
    } catch (err) {
      console.log(err);
    }
  }
}
