import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { AppFile } from '../../../../core/models/app-file.model';
import { FileToIconPipe } from "../../../../core/pipes/file-to-icon.pipe";

@Component({
  selector: 'app-drag-preview',
  imports: [FileToIconPipe],
  templateUrl: './drag-preview.component.html',
  styleUrl: './drag-preview.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class DragPreviewComponent {
  files = input.required<AppFile[]>();
  // targetDirectory = input.required<AppFile | null>();

  fileNames = computed(() => this.files().map(file => file.fileName));
  areSameMimeType = computed(() => {
    const mimeTypes = this.files().map(file => file.mimeType);
    return mimeTypes.every(mimeType => mimeType === mimeTypes[0]);
  });

  get displayNames() {
    return this.fileNames().slice(0, 5);
  }

  get remainingCount() {
    return Math.max(0, this.fileNames().length - 5);
  }
}
