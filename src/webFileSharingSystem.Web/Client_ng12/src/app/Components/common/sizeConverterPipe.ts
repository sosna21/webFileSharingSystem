import {Pipe, PipeTransform} from '@angular/core';

@Pipe({
  name: 'convertSizeToReadable'
})
export class SizeConverterPipe implements PipeTransform {

  transform(size: number): string {
    return this.convertToReadableFileSize(size);
  }

  convertToReadableFileSize(size: number): string {
    if (size <= 0) {
      return "0 B"
    }
    let units = ['B', 'kB', 'MB', 'GB', 'TB', 'PB', 'EB', 'ZB', 'YB']
    let i = Math.floor(Math.log(size) / Math.log(1024));
    return i === 0 ? (size / Math.pow(1024, i)).toFixed(0) + ' ' + units[i]
      : (size / Math.pow(1024, i)).toFixed(2) + ' ' + units[i];
  };
}
