import { Component, computed, input } from '@angular/core';
import { FileToIconPipe } from '../../core/pipes/file-to-icon.pipe';
import { BaseFile, FileStatus } from '../../core/models/base-file.model';
import { ShareAccessMode } from '../../core/models/share-access-mode.model';

@Component({
  selector: 'app-drag-preview',
  imports: [FileToIconPipe],
  templateUrl: './drag-preview.component.html',
  styleUrl: './drag-preview.component.scss',
})
export class DragPreviewComponent {
  files = input.required<BaseFile[]>();

  dragableFiles = computed(() =>
    this.files().filter(
      (file) =>
        file.fileStatus === FileStatus.Completed &&
        file.accessMode !== ShareAccessMode.ReadOnly,
    ),
  );

  fileNames = computed(() => this.dragableFiles().map((file) => file.fileName));
  areSameMimeType = computed(() => {
    const mimeTypes = this.dragableFiles().map((file) => file.mimeType);
    return mimeTypes.every((mimeType) => mimeType === mimeTypes[0]);
  });

  get displayNames() {
    return this.fileNames()
      .slice(0, 5)
      .map((name) => {
        if (name.length >= 33) {
          return name.slice(0, 18) + '...' + name.slice(-10);
        }
        return name;
      });
  }

  get remainingCount() {
    return Math.max(0, this.fileNames().length - 5);
  }
}
