import { Component, computed, inject, linkedSignal, signal, viewChildren } from '@angular/core';
import { AppFile, FileStatus } from '../../../core/models/app-file.model';
import { FileService } from '../../../core/services/file.service';
import { FileToIconPipe } from "../../../core/pipes/file-to-icon.pipe";
import { CommonModule } from '@angular/common';
import { NgbDropdownModule, NgbTooltip, NgbTooltipModule } from '@ng-bootstrap/ng-bootstrap';
import { TimeagoModule } from 'ngx-timeago';
import { FileSizePipe } from "../../../core/pipes/file-size.pipe";
import { ClicableIconDirective } from '../../../core/directives/clicable-icon.directive';
import { FormsModule } from '@angular/forms';
import { ToastService } from '../../../core/services/toast.service';
import { MessageSeverity } from '../../../core/models/toast-info.model';
import { SelectFilenameDirective } from '../../../core/directives/select-filename.directive';

@Component({
  selector: 'app-base-table',
  imports: [CommonModule, FileToIconPipe, NgbTooltipModule, NgbDropdownModule, TimeagoModule, FileSizePipe, ClicableIconDirective, FormsModule, SelectFilenameDirective],
  templateUrl: './base-table.component.html',
  styleUrl: './base-table.component.scss',
})
export class BaseTableComponent {
  private readonly fileService = inject(FileService);
  private readonly toast = inject(ToastService);
  fileResource = this.fileService.fileResource;
  fileResponseResponse = this.fileService.fileResponseResource;
  areAllCheckboxesChecked = computed(() => this.files().length > 0 && this.files().every(file => file.checked));
  files = linkedSignal(() => this.fileResponseResponse()?.items || []);
  tooltips = viewChildren(NgbTooltip);

  lastSelectedFileId = signal<number | null>(null);
  renameInput = signal('');

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

  // Rename file
  initRename(file: AppFile) {
    this.renameInput.set(file.fileName);
    this.files.update(files => files.map(f => f === file ? { ...f, rename: true } : f));
  }

  rename(file: AppFile) {
    const newFileName = this.renameInput().trim();
    this.renameInput.set('');

    if (newFileName === '') {
      this.toast.show('File rename', 'File name cannot be empty', MessageSeverity.error);
      this.cancelRename(file);
      return;
    }
    if (newFileName === file.fileName) {
      this.cancelRename(file);
      return;
    }
    if (this.files().some(f => f.fileName === newFileName)) {
      this.toast.show('File rename', 'File with this name already exists', MessageSeverity.error);
      this.cancelRename(file);
      return;
    }

    this.files.update(files => files.map(f => f.id === file.id ? { ...f, loading: true, rename: false } : f));

    this.fileService.renameFile(file.id, newFileName).subscribe({
      next: () => {
        this.toast.show('File rename', 'File renamed successfully', MessageSeverity.success);
        this.updateFileName(file, newFileName);
      },
      error: (err: any) => {
        this.toast.show('File rename', err.error, MessageSeverity.error);
        this.cancelRename(file);
      }
    }).add(() => this.turnOffFileLoading(file));
  }

  private turnOffFileLoading(file: AppFile) {
    this.files.update(files => files.map(f => f.id === file.id ? { ...f, loading: false } : f));
  }

  private cancelRename(file: AppFile) {
    this.files.update(files => files.map(f => f.id === file.id ? { ...f, rename: false } : f));
  }

  fileRenameKeyDown($event: KeyboardEvent, file: AppFile) {
    if ($event.key === 'Enter') {
      this.rename(file);
    } else if ($event.key === 'Escape') {
      this.cancelRename(file);
    }
    $event.stopPropagation();
  }

  private updateFileName(file: AppFile, newFileName: string) {
    this.files.update(files => files.map(f => f.id === file.id ? { ...f, fileName: newFileName, loading: false } : f));
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

  toggleFavourite(file: AppFile) {
    this.tooltips().forEach(tooltip => tooltip.close());
    this.files.update(files => files.map(f => f.id === file.id ? { ...f, loading: true } : f));
    this.fileService.setFavourite(file).subscribe({
      next: () => {
        this.toast.show('File update', file.isFavourite ? `Removed '${file.fileName}' from favourites` : `Added '${file.fileName}' to favourites`, MessageSeverity.success);
        this.updateFavouriteStatus(file);
      },
      error: (err: any) => {
        this.toast.show('File update', err.error, MessageSeverity.error);
      }
    }).add(() => this.turnOffFileLoading(file));
  }

  private updateFavouriteStatus(file: AppFile) {
    this.files.update(files => files.map(f => f.id === file.id ? { ...f, isFavourite: !f.isFavourite } : f));
  }
}
