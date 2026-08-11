import { Pipe, PipeTransform } from '@angular/core';

@Pipe({
  name: 'fileSize',
})
export class FileSizePipe implements PipeTransform {
  transform(size: number): string {
    if (size <= 0) {
      return '0 B';
    }
    const units = ['B', 'KB', 'MB', 'GB', 'TB', 'PB', 'EB', 'ZB', 'YB'];
    const unitIndex = Math.floor(Math.log(size) / Math.log(1024));
    return unitIndex <= 2
      ? (size / Math.pow(1024, unitIndex)).toFixed(0) + ' ' + units[unitIndex]
      : (size / Math.pow(1024, unitIndex)).toFixed(2) + ' ' + units[unitIndex];
  }
}
