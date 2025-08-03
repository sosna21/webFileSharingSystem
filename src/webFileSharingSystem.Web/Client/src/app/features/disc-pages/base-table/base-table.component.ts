import { Component, computed, inject, linkedSignal, signal } from '@angular/core';
import { AppFile, FileStatus } from '../../../core/models/app-file.model';
import { FileService } from '../../../core/services/file.service';
import { FileToIconPipe } from "../../../core/pipes/file-to-icon.pipe";
import { CommonModule } from '@angular/common';
import { NgbDropdownModule, NgbTooltipModule } from '@ng-bootstrap/ng-bootstrap';
import { TimeagoModule } from 'ngx-timeago';
import { FileSizePipe } from "../../../core/pipes/file-size.pipe";
import { ClicableIconDirective } from '../../../core/directives/clicable-icon.directive';
import { FormsModule } from '@angular/forms';
import { SelectFilenameDirective } from '../../../core/directives/select-filename.directive';

@Component({
  selector: 'app-base-table',
  imports: [CommonModule, FileToIconPipe, NgbTooltipModule, NgbDropdownModule, TimeagoModule, FileSizePipe, ClicableIconDirective, FormsModule, SelectFilenameDirective],
  templateUrl: './base-table.component.html',
  styleUrl: './base-table.component.scss',
})
export class BaseTableComponent {

  private readonly fileService = inject(FileService);
  fileResource = this.fileService.fileResource;
  fileResponseResponse = this.fileService.fileResponseResource;
  areAllCheckboxesChecked = computed(() => this.files().length > 0 && this.files().every(file => file.checked));
  files = linkedSignal(() => this.fileResponseResponse()?.items || []);

  lastSelectedFileId = signal<number | null>(null);

  ngOnInit() {
    window.addEventListener('keydown', this.onKeydown);
  }

  ngOnDestroy() {
    window.removeEventListener('keydown', this.onKeydown);
  }

  onKeydown = (event: KeyboardEvent) => {
    const target = event.target as HTMLElement;

    // Allow Ctrl+A if the target is an input or textarea (for text selection)
    if (
      (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA') &&
      !(target as HTMLInputElement).readOnly
    ) {
      return;
    }

    if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'a') {
      event.preventDefault();
      this.files.update(files => files.map(f => ({ ...f, checked: true })));
    }
  };

  convertToAngularUTC(date: Date): any {
    return new Date(date + 'Z');
  }

  checkAllCheckBox(ev: any) {
    this.files.update(files => files.map(file => ({ ...file, checked: ev.target.checked })));
  }

  isFileUploadCompleted(file: AppFile) {
    return file.fileStatus === FileStatus.Completed;
  }

  selectFolder(folderId: number) {
    this.fileService.goToFolder(folderId);
  }

  selectFile(file: AppFile, event: MouseEvent) {
    const isCtrl = event.ctrlKey || event.metaKey;
    const isShift = event.shiftKey;

    if (this.lastSelectedFileId() === null)
      this.lastSelectedFileId.set(this.files()[0].id);

    const localLastSelectedFileId = this.lastSelectedFileId();

    //if the shift key is pressed, we need to keep the last selected file id,
    // as it will be used as an anchor for the selection
    if (!isShift) {
      this.lastSelectedFileId.set(file.id);
    }

    if (isShift) {
      const newFileIndex = this.files().findIndex(f => f === file);
      const anchorIndex = this.files().findIndex(f => f.id === localLastSelectedFileId);
      let startIndex = Math.min(newFileIndex, anchorIndex);
      let endIndex = Math.max(newFileIndex, anchorIndex);

      this.files.update(files => files.map((f, index) => (index >= startIndex && index <= endIndex)
        ? { ...f, checked: true }
        : { ...f, checked: false }
      ));
      return;
    }

    if (isCtrl) {
      this.files.update(files => files.map(f => f === file ? { ...f, checked: !f.checked } : f));
      return;
    }

    // If no modifiers, select only this file
    this.files.update(files => files.map(f => f === file ? { ...f, checked: true } : { ...f, checked: false }));
  }
}
