import { ChangeDetectionStrategy, Component, computed, inject, linkedSignal, signal, viewChild, viewChildren } from '@angular/core';
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
import { BaseTableContextMenuComponent } from "./base-table-context-menu/base-table-context-menu.component";

@Component({
  selector: 'app-base-table',
  imports: [CommonModule, FileToIconPipe, NgbTooltipModule, NgbDropdownModule, TimeagoModule, FileSizePipe, ClicableIconDirective, FormsModule, SelectFilenameDirective, BaseTableContextMenuComponent],
  templateUrl: './base-table.component.html',
  styleUrl: './base-table.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    '(window:keydown)': 'onKeydown($event)',
  }
})
export class BaseTableComponent {
  private readonly fileService = inject(FileService);
  private readonly toast = inject(ToastService);
  fileResource = this.fileService.fileResource;
  fileResponseResponse = this.fileService.fileResponseResource;
  areAllCheckboxesChecked = computed(() => this.files().length > 0 && this.files().every(file => file.checked));
  files = this.fileService.files;
  selectedFiles = computed(() => this.files().filter(file => file.checked));

  tooltips = viewChildren(NgbTooltip);
  contextMenu = viewChild(BaseTableContextMenuComponent);
  position = signal<{ x: number, y: number }>({ x: 0, y: 0 });

  lastSelectedFileId = signal<number | null>(null);
  renameInput = signal('');

  onKeydown(event: KeyboardEvent) {
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

  checkAllCheckBox(ev: Event) {
    const target = ev.target as HTMLInputElement;
    this.files.update(files => files.map(file => ({ ...file, checked: target.checked })));
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

    this.updateFile(file, { loading: true, rename: false });

    this.fileService.renameFile(file.id, newFileName).subscribe({
      next: () => {
        this.toast.show('File rename', 'File renamed successfully', MessageSeverity.success);
        this.updateFileWithNewData(file, { fileName: newFileName });
      },
      error: (err: unknown) => {
        this.toast.show('File rename', err instanceof Error ? err.message : String(err), MessageSeverity.error);
        this.cancelRename(file);
      }
    }).add(() => this.turnOffFileLoading(file));
  }

  private turnOffFileLoading(file: AppFile) {
    this.updateFile(file, { loading: false });
  }

  private cancelRename(file: AppFile) {
    this.updateFile(file, { rename: false });
  }

  fileRenameKeyDown($event: KeyboardEvent, file: AppFile) {
    if ($event.key === 'Enter') {
      this.rename(file);
    } else if ($event.key === 'Escape') {
      this.cancelRename(file);
    }
    $event.stopPropagation();
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

  changeFavourite(files: AppFile[], changeTo: boolean) {
    this.tooltips().forEach(tooltip => tooltip.close());
    const filesToUpdate = files.filter(file => file.isFavourite !== changeTo);
    let successCounter = 0;

    filesToUpdate.forEach(file => {
      this.updateFile(file, { loading: true });

      this.fileService.setFavourite(file).subscribe({
        next: () => {
          this.updateFileWithNewData(file, { isFavourite: !file.isFavourite });
          successCounter++;
        },
        error: (err: unknown) => {
          this.toast.show(
            'File update',
            err instanceof Error ? err.message : String(err),
            MessageSeverity.error
          );
        }
      }).add(() => this.turnOffFileLoading(file));
    });

    if (successCounter === 1 && filesToUpdate.length === 1) {
      const file = filesToUpdate[0];
      this.toast.show(
        'File update',
        changeTo ? `Removed '${file.fileName}' from favourites` : `Added '${file.fileName}' to favourites`,
        MessageSeverity.success
      );
    } else if (successCounter > 0) {
      this.toast.show(
        'Files update',
        changeTo ? `Removed ${successCounter} files from favourites` : `Added ${successCounter} files to favourites`,
        MessageSeverity.success
      );
    }
  }

  contextMenuClick(event: MouseEvent, file: AppFile) {
    event.preventDefault();
    event.stopPropagation();
    const position = { x: event.clientX, y: event.clientY };
    if (!this.selectedFiles().includes(file)) {
      this.files.update(files => files.map(f => f === file ? { ...f, checked: true } : { ...f, checked: false }));
    }

    this.openContextMenu(position);
  }

  actionIconClick(event: MouseEvent, icon: HTMLElement, file: AppFile) {
    event.stopPropagation();

    const rect = icon.getBoundingClientRect();
    const position = { x: rect.right, y: rect.bottom - rect.height / 4 };
    this.files.update(files => files.map(f => f === file ? { ...f, checked: true } : { ...f, checked: false }));

    this.openContextMenu(position);
  }

  private openContextMenu(position: { x: number; y: number }) {
    this.contextMenu()?.close();
    this.position.set(position);
    this.contextMenu()?.open();
  }

  private updateFile(file: AppFile, partialUpdate?: Partial<AppFile>) {
    this.files.update(files => files.map(f => f.id === file.id ? { ...f, ...partialUpdate } : f));
  }

  private updateFileWithNewData(file: AppFile, partialUpdate?: Partial<AppFile>) {
    const updateTime = new Date();
    this.files.update(files => files.map(f => f.id === file.id ? { ...f, ...partialUpdate, modificationDate: updateTime } : f));
  }
}
