import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { FileUploadService } from '../../services/file-upload.service';
import { FileUploadDragDropService } from '../../services/file-upload-drag-drop.service';
import { DragDropService } from '../../services/drag-drop.service';
import { FileMoveDragDropService } from '../../services/file-move-drag-drop.service';
import { FileShareService } from '../../services/file-share.service';
import { FileService } from '../../services/file.service';
import { StorageService } from '../../services/storage.service';

@Component({
  selector: 'app-authenticated-shell',
  imports: [RouterOutlet],
  providers: [
    FileService,
    DragDropService,
    FileMoveDragDropService,
    FileShareService,
    FileUploadService,
    FileUploadDragDropService,
    StorageService,
  ],
  template: `<router-outlet />`,
  styles: ``,
})
export class AuthenticatedShellComponent {}
