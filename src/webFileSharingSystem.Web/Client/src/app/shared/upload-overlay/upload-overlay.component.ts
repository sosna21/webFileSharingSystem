import { Component, inject } from '@angular/core';
import { DragDropService } from '../../core/services/drag-drop.service';

@Component({
  selector: 'app-upload-overlay',
  imports: [],
  templateUrl: './upload-overlay.component.html',
  styleUrl: './upload-overlay.component.scss',
})
export class UploadOverlayComponent {
  private readonly dragFacade = inject(DragDropService);
  readonly dragTarget = this.dragFacade.dragTarget;
  readonly canWriteToDragTarget = this.dragFacade.hasMinWriteAccess;
  readonly dragPayloadNb = this.dragFacade.filesNb;
  readonly isHoverTargetATable = this.dragFacade.isHoverTargetATable;
}
