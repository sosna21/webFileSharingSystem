import { NgStyle, NgTemplateOutlet } from '@angular/common';
import {
  Component,
  computed,
  input,
  model,
  output,
  viewChild,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { NgbDropdownModule, NgbDropdown } from '@ng-bootstrap/ng-bootstrap';
import { ShareAccessMode } from '../../core/models/share-access-mode.model';
import { ViewMode } from '../../core/services/state.service';

@Component({
  selector: 'app-table-context-menu',
  imports: [NgbDropdownModule, NgStyle, FormsModule, NgTemplateOutlet],
  templateUrl: './table-context-menu.component.html',
  styleUrl: './table-context-menu.component.scss',
})
export class TableContextMenuComponent {
  readonly dropdown = viewChild(NgbDropdown);
  readonly position = input.required<{ x: number; y: number }>();
  readonly accessMode = input.required<ShareAccessMode | undefined>();
  readonly canPaste = input.required<boolean>();
  readonly sortableColumns = input<{ column: string; displayName: string }[]>();
  readonly sortOption = input<{
    column: string;
    direction: 'asc' | 'desc';
  } | null>();
  readonly viewMode = model.required<ViewMode>();

  readonly ShareAccessMode = ShareAccessMode;
  readonly hasMinReadWriteAccess = computed(
    () => this.accessMode() !== ShareAccessMode.ReadOnly,
  );

  readonly refresh = output();
  readonly createFolder = output();
  readonly upload = output<File[]>();
  readonly paste = output();
  readonly sortByColumn = output<string>();

  open() {
    this.dropdown()?.open();
  }

  close() {
    if (this.dropdown()?.isOpen()) {
      this.dropdown()?.close();
    }
  }

  uploadClicked($event: Event) {
    if (!$event.target) return;
    const files = this.getFilesFromInputElement($event.target);

    this.upload.emit(files);
  }

  private getFilesFromInputElement(target: EventTarget): File[] {
    if (!(target instanceof HTMLInputElement)) return [];
    const files = target.files;
    if (files === null) return [];
    return Array.from(files);
  }
}
