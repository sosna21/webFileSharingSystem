import {Directive, EventEmitter, HostBinding, HostListener, Output} from '@angular/core';

@Directive({
  selector: '[appDnd]'
})
export class DndDirective {
  @HostBinding('class.fileOver') fileOver: boolean = false;
  @Output() fileDropped = new EventEmitter<any>();

  constructor() {
  }

  @HostListener('dragover', ['$event']) onDragOver(evt: any) {
    evt.preventDefault();
   // evt.dataTransfer.dropEffect = "move";
    evt.stopPropagation();
    this.fileOver = true;
  }

  @HostListener('dragleave', ['$event']) onDragLeave(evt: any) {
    evt.preventDefault();
    evt.stopPropagation();
    this.fileOver = false;
  }

  @HostListener('drop', ['$event']) onDrop(evt: any) {
    evt.stopPropagation();
    this.fileOver = false;
  }

  // Below first try to unify dropzone to accept files and folders at the same time

  // private parseFileEntry(fileEntry: any) {
  //   return new Promise((resolve, reject) => {
  //     fileEntry.file(
  //       (file:any) => {
  //         resolve(file);
  //       },
  //       (err:any) => {
  //         reject(err);
  //       }
  //     );
  //   });
  // }
  //
  // private parseDirectoryEntry(directoryEntry: any) {
  //   const directoryReader = directoryEntry.createReader();
  //   return new Promise((resolve, reject) => {
  //     directoryReader.readEntries(
  //       (entries: any) => {
  //         resolve(entries);
  //       },
  //       (err: any) => {
  //         reject(err);
  //       }
  //     );
  //   });
  // }


  // private readFileEntities(entries: any[]){
  //   let files: File[] = [];
  //   for (let i = 0; i < entries.length; i++) {
  //     const item = entries[i];
  //     if (item.kind === 'file') {
  //       const entry = item.webkitGetAsEntry();
  //       if (entry.isFile) {
  //         files.push(entry.file());
  //        // return  this.parseFileEntry(entry);
  //       } else if (entry.isDirectory) {
  //         const directoryReader = entry.createReader();
  //         directoryReader.readEntries(
  //           (entries: any) => {
  //             console.log(entries);
  //             this.readFileEntities(entries);
  //            //return this.readFileEntities(entries);
  //           });
  //       }
  //     }
  //   }
  //   return files;
  // }


  // @HostListener('drop', ['$event']) onDrop(evt: any) {
  //   evt.preventDefault();
  //   console.log(evt.dataTransfer.items);
  //   evt.stopPropagation();
  //   this.fileOver = false;
  //   const items = evt.dataTransfer.items;
  //   console.log( this.readFileEntities(items));
  // }
}
