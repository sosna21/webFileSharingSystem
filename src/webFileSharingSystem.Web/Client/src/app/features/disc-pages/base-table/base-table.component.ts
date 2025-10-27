import { ChangeDetectionStrategy, Component, computed, ElementRef, inject, linkedSignal, signal, viewChild, viewChildren } from '@angular/core';
import { AppFile, FileStatus, ProgressStatus } from '../../../core/models/app-file.model';
import { FileService } from '../../../core/services/file.service';
import { FileToIconPipe } from "../../../core/pipes/file-to-icon.pipe";
import { CommonModule, DecimalPipe, JsonPipe } from '@angular/common';
import { NgbDropdownModule, NgbModal, NgbTooltip, NgbTooltipModule, NgbProgressbarModule } from '@ng-bootstrap/ng-bootstrap';
import { TimeagoModule } from 'ngx-timeago';
import { FileSizePipe } from "../../../core/pipes/file-size.pipe";
import { ClicableIconDirective } from '../../../core/directives/clicable-icon.directive';
import { FormsModule } from '@angular/forms';
import { ToastService } from '../../../core/services/toast.service';
import { MessageSeverity } from '../../../core/models/toast-info.model';
import { SelectFilenameDirective } from '../../../core/directives/select-filename.directive';
import { BaseTableContextMenuComponent } from "./base-table-context-menu/base-table-context-menu.component";
import { bulkAction } from '../../../core/utils/bulk-action-util';
import { ConfirmationModalComponent } from '../../../core/components/confirmation-modal/confirmation-modal.component';
import { DragPreviewComponent } from "./drag-preview/drag-preview.component";
import { FileDragDropService } from '../../../core/services/file-drag-drop.service';
import { FileUploadDragDropService } from '../../../core/services/file-upload-drag-drop.service';
import { DragDropUtils } from '../../../core/utils/drag-drop-utils';
import { FileUploadService } from '../../../core/services/file-upload.service';
import { UploadStatus } from '../../../core/models/upload-progress-info.model';


@Component({
  selector: 'app-base-table',
  imports: [CommonModule, DecimalPipe, FileToIconPipe, NgbTooltipModule, NgbDropdownModule, TimeagoModule, 
    FileSizePipe, ClicableIconDirective, FormsModule, SelectFilenameDirective, BaseTableContextMenuComponent, 
    DragPreviewComponent, NgbProgressbarModule],
  templateUrl: './base-table.component.html',
  styleUrl: './base-table.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    class: 'h-100',
    style: 'max-height: 100%; min-height: 400px',
    '(window:keydown)': 'onKeydown($event)',
  }
})
export class BaseTableComponent {
  readonly FileStatus = FileStatus;
  readonly ProgressStatus = ProgressStatus;
  private readonly fileService = inject(FileService);
  private readonly toast = inject(ToastService);
  private readonly modalService = inject(NgbModal);
  private readonly uploadService = inject(FileUploadService);
  fileResource = this.fileService.fileResource;
  areAllCheckboxesChecked = computed(() => this.files().length > 0 && this.files().every(file => file.checked));
  files = linkedSignal<AppFile[]>(() => this.fileService.files().map(f => this.uploadService.uploadProgresses().hasOwnProperty(f.id)
    ? {
      ...f,
      uploadProgress: this.uploadService.uploadProgresses()[f.id].progress!,
      progressStatus: this.uploadService.uploadProgresses()[f.id].status === UploadStatus.InProgress
        ? ProgressStatus.Started
        : ProgressStatus.Stopped
    }
    : f));
  selectedFiles = computed(() => this.files().filter(file => file.checked));

  tooltips = viewChildren(NgbTooltip);
  contextMenu = viewChild(BaseTableContextMenuComponent);
  contextMenuPosition = signal<{ x: number, y: number }>({ x: 0, y: 0 });

  lastSelectedFileId = signal<number | null>(null);
  renameInput = signal('');
  currentDirectoryId = this.fileService.parentId;

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
    const filesToUpdate = files.filter(file => file.isFavourite !== changeTo);
    if (filesToUpdate.length === 0) return;

    this.tooltips().forEach(t => t.close());

    bulkAction<AppFile>({
      items: filesToUpdate,
      action: file => this.fileService.setFavourite(file),
      beforeStart: file => this.updateFile(file, { loading: true }),
      onSuccess: file => this.updateFileWithNewData(file, { isFavourite: changeTo, loading: false }),
      onError: (_, err) => {
        this.toast.show(
          'Favourite update failed',
          err instanceof Error ? err.message : String(err),
          MessageSeverity.error
        );
      },
      toast: (title, msg, severity) => this.toast.show(title, msg, severity),
      successMessage: (count, updated) => {
        if (count === 1) {
          return changeTo
            ? `Added '${updated[0].fileName}' to favourites`
            : `Removed '${updated[0].fileName}' from favourites`;
        }
        return changeTo
          ? `Added ${count} files to favourites`
          : `Removed ${count} files from favourites`;
      }
    });
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
    this.contextMenuPosition.set(position);
    this.contextMenu()?.open();
  }

  private updateFile(file: AppFile, partialUpdate?: Partial<AppFile>) {
    this.files.update(files => files.map(f => f.id === file.id ? { ...f, ...partialUpdate } : f));
  }

  private updateFileWithNewData(file: AppFile, partialUpdate?: Partial<AppFile>) {
    const updateTime = new Date();
    this.files.update(files => files.map(f => f.id === file.id ? { ...f, ...partialUpdate, modificationDate: updateTime } : f));
  }

  private async openConfirmationModal(title: string, message: string, confirmText: string, cancelText: string, showPermanentDeleteWarning: boolean) {
    const modalRef = this.modalService.open(ConfirmationModalComponent, { centered: true });
    const component = modalRef.componentInstance as ConfirmationModalComponent;
    component.title.set(title);
    component.message.set(message);
    component.confirmText.set(confirmText);
    component.cancelText.set(cancelText);
    component.showPermanentDeleteWarning.set(showPermanentDeleteWarning);

    try {
      return await modalRef.result; // resolves with "true" if confirmed
    } catch {
      return false;
    }
  }


  deleteSelectedFiles() {
    const filesToDelete = this.selectedFiles();
    if (filesToDelete.length === 0) {
      this.toast.show('No files selected', 'Please select files to delete', MessageSeverity.info);
      return;
    }

    this.deleteFiles(filesToDelete);
  }

  private async deleteFiles(filesToDelete: AppFile[]) {
    if (filesToDelete.length === 0) {
      return;
    }

    const maxLines = 5;
    const totalFiles = filesToDelete.length;
    const fileNamesList = filesToDelete.map(f => f.fileName);

    let confirmText = '';

    if (totalFiles === 1) {
      confirmText = `Are you sure you want to delete '${fileNamesList[0]}' file?`;
    }
    else if (totalFiles > maxLines) {
      const shownCount = Math.max(1, maxLines - 1);
      const shown = fileNamesList.slice(0, shownCount);
      const remainingCount = totalFiles - shownCount;
      const displayNames = [
        ...shown.map(name => `• ${name}`),
        `...and ${remainingCount} more`
      ];
      confirmText = `Are you sure you want to delete these files?\n${displayNames.join('\n')}`;
    }
    else {
      const displayNames = fileNamesList.map(name => `• ${name}`);
      confirmText = `Are you sure you want to delete these files?\n${displayNames.join('\n')}`;
    }

    const confirmationResult = await this.openConfirmationModal(
      'Confirm File Deletion',
      confirmText,
      'Delete',
      'Cancel',
      true
    );
    if (!confirmationResult) return;

    bulkAction<AppFile>({
      items: filesToDelete,
      action: file => this.fileService.deleteFile(file),
      beforeStart: file => this.updateFile(file, { loading: true }),
      onSuccess: file => this.files.update(list => list.filter(f => f.id !== file.id)),
      onError: (file, err) => {
        this.toast.show(
          'File deletion',
          err instanceof Error ? err.message : String(err),
          MessageSeverity.error
        );
        this.turnOffFileLoading(file);
      },
      toast: (title, msg, severity) => this.toast.show(title, msg, severity),
      successMessage: count => `Deleted ${count} file(s) successfully`
    });
  }

  // Drag and drop logic for moving and uploading files
  private readonly fileMoveDragPreview = viewChild(DragPreviewComponent, { read: ElementRef });
  private readonly dragDrop = inject(FileDragDropService);
  readonly uploadDragDrop = inject(FileUploadDragDropService);
  readonly dragOverFileId = computed(() => this.dragDrop.dragOverTarget()?.type === 'file' ? this.dragDrop.dragOverTarget()?.id : null);
  readonly fileUploadDragOverFileId = computed(() => this.uploadDragDrop.hoveredTarget()?.target?.id);
  readonly fileUploadTarget = this.uploadDragDrop.uploadTarget;
  readonly fileUploadHoverTargetCorrect = computed(() => this.uploadDragDrop.hoveredTarget() && this.uploadDragDrop.hoveredTarget()?.target?.id === this.uploadDragDrop.uploadTarget()?.id);
  readonly fileUpladFileNb = this.uploadDragDrop.filesNb;
  readonly fileUploadTableTarget = computed(() => this.uploadDragDrop.hoveredTarget()?.type === 'table');
  counter = 1;

  canBeTargetDirectory(file: AppFile) {
    return file.isDirectory && !file.checked;
  }

  onRowDragStart(event: DragEvent, file: AppFile) {
    if (!file.checked) {
      event.preventDefault();
      return;
    }
    const draggedFiles = this.selectedFiles();
    this.dragDrop.startDrag(draggedFiles);

    event.dataTransfer?.setData('application/json', JSON.stringify(draggedFiles));
    event.dataTransfer!.effectAllowed = 'move';

    const previewEl = this.fileMoveDragPreview()?.nativeElement.firstElementChild as HTMLElement;
    if (previewEl) {
      event.dataTransfer!.setDragImage(previewEl, 0, 0);
    }
  }

  onRowDragEnter(event: DragEvent, row: AppFile) {
    event.preventDefault();

    if (this.uploadDragDrop.allowExternalFiles(event)) {
      if (row.isDirectory) {
        event.stopPropagation();
        this.uploadDragDrop.setHoverTarget({ type: 'directory', target: row }, event);
      }
    } else if (this.dragDrop.allowAppFiles(event)) {
      this.dragDrop.setDragOverTarget('file', row.id);
      this.dragDrop.setDropEffect(event, true);
    }
  }

  onRowDragOver(event: DragEvent, row: AppFile) {
    event.preventDefault();
    this.dragDrop.setDropEffect(event, this.dragDrop.allowAppFiles(event) || this.uploadDragDrop.allowExternalFiles(event));
  }

  onRowDragLeave(event: DragEvent, file: AppFile) {
    event.preventDefault();
    if (!DragDropUtils.isTrueDragLeave(event))
      return;

    if (
      this.uploadDragDrop.hoveredTarget()?.type === 'directory' &&
      this.uploadDragDrop.hoveredTarget()?.target?.id === file.id
    ) {
      this.uploadDragDrop.clearHover();
    }

    if (this.dragDrop.dragOverTarget()?.id === file.id) {
      this.dragDrop.clearDragOverTarget();
    }
  }

  async onRowDrop(event: DragEvent, targetFile: AppFile) {
    event.preventDefault();
    event.stopPropagation();
    // External files
    if (this.uploadDragDrop.allowExternalFiles(event)) {
      //const files = this.uploadDragDrop.getDroppedFiles(event);
      const destinationId = this.uploadDragDrop.getDestinationFolder(targetFile, this.currentDirectoryId());
      await this.uploadDragDrop.uploadDraggedFiles(event, destinationId);
      return;
    }

    // Internal files
    if (this.dragDrop.allowAppFiles(event)) {
      if (!targetFile.isDirectory || targetFile.checked)
        return;
      this.dragDrop.moveFiles(targetFile.id, targetFile.fileName);
    }
  }

  onTableDragEnter(event: DragEvent) {
    event.preventDefault();

    if (this.uploadDragDrop.allowExternalFiles(event)) {
      this.uploadDragDrop.setHoverTarget({ type: 'table', target: null }, event);
    }
  }

  onTableDragOver(event: DragEvent) {
    event.preventDefault();
    this.dragDrop.setDropEffect(event, this.dragDrop.allowAppFiles(event) || this.uploadDragDrop.allowExternalFiles(event));
  }

  async onTableDrop(event: DragEvent) {
    event.preventDefault();
    event.stopPropagation();
    if (this.uploadDragDrop.allowExternalFiles(event)) {
      const destinationId = this.currentDirectoryId();
      await this.uploadDragDrop.uploadDraggedFiles(event, destinationId);
      return;
    }
  }

  onTableDragLeave(event: DragEvent) {
    event.preventDefault();
    if (!DragDropUtils.isTrueDragLeave(event))
      return;

    if (this.uploadDragDrop.hoveredTarget()?.type === 'table') {
      this.uploadDragDrop.clearHover();
    }
  }

  getFileSize(fileSize: string) {
    return +fileSize.split(' ')[0];
  }

  cancelUpload(file: AppFile) {
    if (file.fileStatus !== FileStatus.Incomplete) return;
    this.uploadService.cancel(file.id);
    this.deleteFiles([file]);
  }
}
