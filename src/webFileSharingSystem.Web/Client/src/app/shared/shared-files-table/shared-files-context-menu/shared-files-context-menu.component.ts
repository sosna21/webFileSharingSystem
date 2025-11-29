import { NgStyle } from '@angular/common';
import { Component, computed, input, output, viewChild } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { NgbDropdownModule, NgbDropdown } from '@ng-bootstrap/ng-bootstrap';
import { SharedFile } from '../../../core/models/shared-file.model';
import { ShareAccessMode } from '../../../core/models/share-access-mode.model';

@Component({
  selector: 'app-shared-files-context-menu',
  imports: [NgbDropdownModule, NgStyle, FormsModule],
  templateUrl: './shared-files-context-menu.component.html',
  styleUrl: './shared-files-context-menu.component.scss',
})
export class SharedFilesContextMenuComponent {
  readonly dropdown = viewChild(NgbDropdown);
  readonly position = input.required<{ x: number; y: number }>();
  readonly selectedFiles = input.required<SharedFile[]>();

  readonly ShareAccessMode = ShareAccessMode;

  readonly showOpenFolder = computed(
    () =>
      this.selectedFiles().length === 1 && this.selectedFiles()[0].isDirectory
  );

  readonly canRename = computed(
    () =>
      this.selectedFiles().length === 1 &&
      this.selectedFiles()[0].accessMode >= ShareAccessMode.ReadWrite
  );

  readonly canDelete = computed(
    () =>
      this.selectedFiles().length > 0 &&
      this.selectedFiles().every(
        (f) => f.accessMode === ShareAccessMode.FullAccess
      )
  );

  readonly rename = output<SharedFile>();
  readonly download = output<SharedFile[]>();
  readonly delete = output<SharedFile[]>();
  readonly copy = output<SharedFile[]>();
  readonly openFolder = output<SharedFile>();

  open() {
    this.dropdown()?.open();
  }

  close() {
    if (this.dropdown()?.isOpen()) {
      this.dropdown()?.close();
    }
  }

  copyClicked() {
    this.copy.emit(this.selectedFiles());
  }

  deleteClicked() {
    this.delete.emit(this.selectedFiles());
  }

  downloadClicked() {
    this.download.emit(this.selectedFiles());
  }
}
