import { Injectable } from '@angular/core';
import * as streamSaver from 'streamsaver';
import { WritableStream } from 'web-streams-polyfill/ponyfill';
import {environment} from "../../environments/environment";
import {AuthenticationService} from "./authentication.service";

declare global {
  interface Window {
    writer: any;
  }
}

@Injectable({
  providedIn: 'root'
})
export class DownloadService {

  constructor(private authenticationService: AuthenticationService) { }

  downloadSingleFile(fileId: number) {
    const user = this.authenticationService.currentUserValue;

    fetch(`${environment.apiUrl}/Download/${fileId}/Anonymous`,
      {
      headers: {
        Authorization: `Bearer ${user.token}`
      },
    }
    )
      .then( response => {

        let contentDisposition = response.headers.get('Content-Disposition');
        let fileName = contentDisposition!.substring(contentDisposition!.lastIndexOf('=') + 1);

        // These code section is adapted from an example of the StreamSaver.js
        // https://jimmywarting.github.io/StreamSaver.js/examples/fetch.html

        // If the WritableStream is not available (Firefox, Safari), take it from the ponyfill
        if (!window.WritableStream) {
          //streamSaver.WritableStream = WritableStream;
          window.WritableStream = WritableStream;
        }

        const fileStream = streamSaver.createWriteStream(fileName);
        const readableStream = response.body!;

        // More optimized
        if (readableStream.pipeTo) {
          return readableStream.pipeTo(fileStream);
        }

        let writer : any = window.writer = fileStream.getWriter();

        const reader = response.body!.getReader();
        const pump = () => reader.read()
          .then(res => res.done
            ? writer.close()
            : writer.write(res.value).then(pump));

        pump();

        return;
      })
      .catch(error => {
        console.log(error);
      });
  }
}
