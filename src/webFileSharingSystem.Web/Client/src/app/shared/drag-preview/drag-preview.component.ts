import { Component, computed, input } from '@angular/core';
import { FileToIconPipe } from '../../core/pipes/file-to-icon.pipe';
import { BaseFile } from '../../core/models/base-file.model';

@Component({
  selector: 'app-drag-preview',
  imports: [FileToIconPipe],
  templateUrl: './drag-preview.component.html',
  styleUrl: './drag-preview.component.scss',
})
export class DragPreviewComponent {
  files = input.required<BaseFile[]>();

  fileNames = computed(() => this.files().map((file) => file.fileName));
  areSameMimeType = computed(() => {
    const mimeTypes = this.files().map((file) => file.mimeType);
    return mimeTypes.every((mimeType) => mimeType === mimeTypes[0]);
  });

  get displayNames() {
    return this.fileNames()
      .slice(0, 5)
      .map((name) => {
        if (name.length > 35) {
          return name.slice(0, 20) + '...' + name.slice(-10);
        }
        return name;
      });
  }

  get remainingCount() {
    return Math.max(0, this.fileNames().length - 5);
  }
}
