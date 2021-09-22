import {Pipe, PipeTransform} from '@angular/core';

@Pipe({
  name: 'mimeFontawesome'
})
export class MimeFontawesomePipe implements PipeTransform {

  transform(mimeType?: string): any {
    return this.getFontAwesomeIconFromMIME(mimeType);
  }

  getFontAwesomeIconFromMIME(mimeType?: string) {
    let icon_classes: any = {
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
    };

    if (mimeType) {
      return icon_classes[mimeType] || icon_classes[mimeType.split('/')[0]] || "file";
    }

    return "folder";
  }
}
