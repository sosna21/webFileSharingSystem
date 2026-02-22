import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { FileUploadService } from '../../services/file-upload.service';
import { FileUploadDragDropService } from '../../services/file-upload-drag-drop.service';
import { DragDropService } from '../../services/drag-drop.service';
import { FileDragDropService } from '../../services/file-drag-drop.service';
import { FileShareService } from '../../services/file-share.service';
import { FileService } from '../../services/file.service';

@Component({
  selector: 'app-authenticated-shell',
  imports: [RouterOutlet],
  providers: [
    FileService,
    DragDropService,
    FileDragDropService,
    FileShareService,
    FileUploadService,
    FileUploadDragDropService,
  ],
  template: `<router-outlet />`,
  styles: ``,
})
export class AuthenticatedShellComponent {}
