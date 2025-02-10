import {Pipe, PipeTransform} from '@angular/core';


@Pipe({
  name: 'mimeFontawesome'
})
export class MimeFontawesomePipe implements PipeTransform {

  transform(file: any): any {
    return this.getFontAwesomeIconFromMIME(file);
  }

  getFontAwesomeIconFromMIME(file: any) {
    let icon_classes: Record<string, string> = {
      // Media
      image: "file-image",
      audio: "file-audio",
      video: "file-video",
      //Code
      "text/csv" : "file-code",
      "application/xml" : "file-code",
      "text/css" : "file-code",
      "application/json": "file-code",
      "text/html": "file-code",
      "application/ld+json" : "file-code",
      "text/javascript" : "file-code",
      "application/x-httpd-php" : "file-code",
    // Documents
      "application/pdf": "file-pdf",
      "application/msword": "file-word",
      "application/vnd.ms-word": "file-word",
      "application/vnd.oasis.opendocument.text": "file-word",
      "application/vnd.openxmlformatsfficedocument.wordprocessingml": "file-word",
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document" : "file-word",
      "application/vnd.ms-excel": "file-excel",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": "file-excel",
      "application/vnd.openxmlformatsfficedocument.spreadsheetml": "file-excel",
      "application/vnd.oasis.opendocument.spreadsheet": "file-excel",
      "application/vnd.ms-powerpoint": "file-powerpoint",
      "application/vnd.openxmlformatsfficedocument.presentationml": "file-powerpoint",
      "application/vnd.oasis.opendocument.presentation": "file-powerpoint",
      "application/vnd.openxmlformats-officedocument.presentationml.presentation": "file-powerpoint",
      "text/plain": "file-alt",
      "application/rtf" : "file-alt",

      // Archives
      "application/gzip": "file-archive",
      "application/zip": "file-archive",
      "application/vnd.rar" : "file-archive",
      "application/x-7z-compressed": "file-archive",
      "application/java-archive" : "file-archive",
      "application/x-tar" : "file-archive",
    };

    if (file.mimeType) {
      return icon_classes[file.mimeType] || icon_classes[file.mimeType.split('/')[0]] || "file";
    } else if(file.isDirectory) {
      return "folder";
    }
    let fileExt = file.fileName.split('.').pop();
    if(fileExt == 'rar' || 'zip' || '7z' || 'tar' || 'gzip' )  return "file-archive";
    return "file"

  }
}
