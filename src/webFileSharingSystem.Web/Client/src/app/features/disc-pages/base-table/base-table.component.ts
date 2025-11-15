import {
  ChangeDetectionStrategy,
  Component,
  computed,
  ElementRef,
  inject,
  signal,
  viewChild,
  viewChildren,
} from '@angular/core';
import {
  AppFile,
  FileStatus,
  ProgressStatus,
} from '../../../core/models/app-file.model';
import { FileService } from '../../../core/services/file.service';
import { FileToIconPipe } from '../../../core/pipes/file-to-icon.pipe';
import { CommonModule, DecimalPipe } from '@angular/common';
import {
  NgbDropdownModule,
  NgbTooltip,
  NgbTooltipModule,
  NgbProgressbarModule,
} from '@ng-bootstrap/ng-bootstrap';
import { TimeagoModule } from 'ngx-timeago';
import { FileSizePipe } from '../../../core/pipes/file-size.pipe';
import { ClicableIconDirective } from '../../../core/directives/clicable-icon.directive';
import { FormsModule } from '@angular/forms';
import { ToastService } from '../../../core/services/toast.service';
import { MessageSeverity } from '../../../core/models/toast-info.model';
import { SelectFilenameDirective } from '../../../core/directives/select-filename.directive';
import { BaseTableContextMenuComponent } from './base-table-context-menu/base-table-context-menu.component';
import { bulkAction } from '../../../core/utils/bulk-action-util';
import { DragPreviewComponent } from './drag-preview/drag-preview.component';
import { FileDragDropService } from '../../../core/services/file-drag-drop.service';
import { FileUploadDragDropService } from '../../../core/services/file-upload-drag-drop.service';
import { DragDropUtils } from '../../../core/utils/drag-drop-utils';
import { FileUploadService } from '../../../core/services/file-upload.service';
import { ActionType } from '../../../core/models/action-type.model';
import { FileShareService } from '../../../core/services/file-share.service';
import { ModalService } from '../../../core/services/modal.service';
import { DownloadService } from '../../../core/services/download.service';
import { lastValueFrom } from 'rxjs';

@Component({
  selector: 'app-base-table',
  imports: [
    CommonModule,
    DecimalPipe,
    FileToIconPipe,
    NgbTooltipModule,
    NgbDropdownModule,
    TimeagoModule,
    FileSizePipe,
    ClicableIconDirective,
    FormsModule,
    SelectFilenameDirective,
    BaseTableContextMenuComponent,
    DragPreviewComponent,
    NgbProgressbarModule,
  ],
  templateUrl: './base-table.component.html',
  styleUrl: './base-table.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    class: 'h-100',
    style: 'max-height: 100%; min-height: 400px',
    '(window:keydown)': 'onKeydown($event)',
  },
})
export class BaseTableComponent {
  readonly FileStatus = FileStatus;
  readonly ProgressStatus = ProgressStatus;
  private readonly fileService = inject(FileService);
  private readonly downloadService = inject(DownloadService);
  private readonly toast = inject(ToastService);
  private readonly uploadService = inject(FileUploadService);
  private readonly shareService = inject(FileShareService);
  private readonly modalService = inject(ModalService);

  fileResource = this.fileService.fileResource;
  areAllCheckboxesChecked = computed(
    () => this.files().length > 0 && this.files().every((file) => file.checked)
  );
  files = this.fileService.files;
  selectedFiles = this.fileService.selectedFiles;
  filesMarkedForAction = this.fileService.waitingForAction;

  tooltips = viewChildren(NgbTooltip);
  contextMenu = viewChild(BaseTableContextMenuComponent);
  contextMenuPosition = signal<{ x: number; y: number }>({ x: 0, y: 0 });

  lastSelectedFileId = signal<number | null>(null);
  currentDirectoryId = this.fileService.parentId;

  onKeydown(event: KeyboardEvent) {
    const target = event.target as HTMLElement;

    // Allow Ctrl+A if the target is an input or textarea (for text selection)
    if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA') {
      return;
    }

    if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'a') {
      event.preventDefault();
      this.fileService.files.update((files) =>
        files.map((f) => ({ ...f, checked: true }))
      );
    }
  }

  checkAllCheckBox(ev: Event) {
    const target = ev.target as HTMLInputElement;
    this.fileService.files.update((files) =>
      files.map((file) => ({ ...file, checked: target.checked }))
    );
  }

  isFileUploadCompleted(file: AppFile) {
    return file.fileStatus === FileStatus.Completed;
  }

  selectFolder(folderId: number) {
    this.fileService.goToFolder(folderId);
  }

  // Rename file
  initRename(file: AppFile) {
    this.fileService.files.update((files) =>
      files.map((f) => (f === file ? { ...f, rename: true } : f))
    );
  }

  private turnOffFileLoading(file: AppFile) {
    this.updateFile(file, { loading: false });
  }

  private cancelRename(file: AppFile) {
    this.updateFile(file, { rename: false });
  }

  rename(file: AppFile, newFileName: string) {
    newFileName = newFileName.trim();

    if (newFileName === '') {
      this.toast.show(
        'File rename',
        'File name cannot be empty',
        MessageSeverity.error
      );
      this.cancelRename(file);
      return;
    }
    if (newFileName === file.fileName) {
      this.cancelRename(file);
      return;
    }
    if (this.files().some((f) => f.fileName === newFileName)) {
      this.toast.show(
        'File rename',
        'File with this name already exists',
        MessageSeverity.error
      );
      this.cancelRename(file);
      return;
    }

    this.updateFile(file, { loading: true, rename: false });

    this.fileService
      .renameFile(file.id, newFileName)
      .subscribe({
        next: () => {
          this.toast.show(
            'File rename',
            'File renamed successfully',
            MessageSeverity.success
          );
          this.updateFileWithNewData(file, { fileName: newFileName });
        },
        error: (err) => {
          this.toast.show(
            'File rename',
            err.error || String(err),
            MessageSeverity.error
          );
          this.cancelRename(file);
        },
      })
      .add(() => this.turnOffFileLoading(file));
  }

  fileRenameKeyDown($event: KeyboardEvent, file: AppFile) {
    if ($event.key === 'Enter') {
      this.rename(file, ($event.target as HTMLInputElement).value);
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
    // it will be used as an anchor for the selection
    if (!isShift) {
      this.lastSelectedFileId.set(file.id);
    }

    if (isShift) {
      const newFileIndex = this.files().findIndex((f) => f === file);
      const anchorIndex = this.files().findIndex(
        (f) => f.id === localLastSelectedFileId
      );
      let startIndex = Math.min(newFileIndex, anchorIndex);
      let endIndex = Math.max(newFileIndex, anchorIndex);

      this.fileService.files.update((files) =>
        files.map((f, index) =>
          index >= startIndex && index <= endIndex
            ? { ...f, checked: true }
            : { ...f, checked: false }
        )
      );
      return;
    }

    if (isCtrl) {
      this.fileService.files.update((files) =>
        files.map((f) => (f === file ? { ...f, checked: !f.checked } : f))
      );
      return;
    }

    // If no modifiers, select only this file
    this.fileService.files.update((files) =>
      files.map((f) =>
        f === file ? { ...f, checked: true } : { ...f, checked: false }
      )
    );
  }

  changeFavourite(files: AppFile[], changeTo: boolean) {
    const filesToUpdate = files.filter(
      (file) =>
        file.fileStatus === FileStatus.Completed &&
        file.isFavourite !== changeTo
    );
    if (filesToUpdate.length === 0) return;

    this.tooltips().forEach((t) => t.close());

    bulkAction<AppFile>({
      items: filesToUpdate,
      action: (file) => this.fileService.setFavourite(file),
      beforeStart: (file) => this.updateFile(file, { loading: true }),
      onSuccess: (file) =>
        this.updateFileWithNewData(file, {
          isFavourite: changeTo,
          loading: false,
        }),
      onError: (_, err) => {
        this.toast.show(
          'Favourite update failed',
          err.error || String(err),
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
      },
    });
  }

  downloadFiles(files: AppFile[]) {
    this.downloadService.downloadFilesWithFeedback(files);
  }

  async generateShareLink(files: AppFile[]) {
    const downloadLink = await lastValueFrom(
      this.downloadService.getDownloadLink(files.map((f) => f.id))
    ).catch((error) => {
      this.toast.show(
        'Link Generation Failed',
        error?.error || String(error),
        MessageSeverity.error
      );
      return null;
    });
    if (!downloadLink) return;

    const result = await this.modalService.copyToClipboard({
      textToCopy: downloadLink.url,
      title: 'Share Link',
    });

    if (!result) return;
    this.toast.show(
      'Copied to Clipboard',
      'Share link has been copied to clipboard',
      MessageSeverity.success
    );
  }

  showShareManagementModal(sharedFile: AppFile) {
    this.modalService.manageSharesModal({
      sharedFile: sharedFile,
      title: `Manage shares for file: '${sharedFile.fileName}'`,
    });
  }

  shareFile(files: AppFile[]) {
    this.shareService.shareFilesWithFeedback(files);
  }

  contextMenuClick(event: MouseEvent, file: AppFile) {
    event.preventDefault();
    event.stopPropagation();
    const position = { x: event.clientX, y: event.clientY };
    if (!this.selectedFiles().includes(file)) {
      this.fileService.files.update((files) =>
        files.map((f) =>
          f === file ? { ...f, checked: true } : { ...f, checked: false }
        )
      );
    }

    this.openContextMenu(position);
  }

  actionIconClick(event: MouseEvent, icon: HTMLElement, file: AppFile) {
    event.stopPropagation();

    const rect = icon.getBoundingClientRect();
    const position = { x: rect.right, y: rect.bottom - rect.height / 4 };
    this.fileService.files.update((files) =>
      files.map((f) =>
        f === file ? { ...f, checked: true } : { ...f, checked: false }
      )
    );

    this.openContextMenu(position);
  }

  private openContextMenu(position: { x: number; y: number }) {
    this.contextMenu()?.close();
    this.contextMenuPosition.set(position);
    this.contextMenu()?.open();
  }

  private updateFile(file: AppFile, partialUpdate?: Partial<AppFile>) {
    this.fileService.files.update((files) =>
      files.map((f) => (f.id === file.id ? { ...f, ...partialUpdate } : f))
    );
  }

  private updateFileWithNewData(
    file: AppFile,
    partialUpdate?: Partial<AppFile>
  ) {
    const updateTime = new Date();
    this.fileService.files.update((files) =>
      files.map((f) =>
        f.id === file.id
          ? { ...f, ...partialUpdate, modificationDate: updateTime }
          : f
      )
    );
  }

  deleteFiles(files: AppFile[]) {
    this.fileService.deleteFilesWithFeedback(files);
  }

  initFileMove(files: AppFile[]) {
    this.fileService.setFilesMarkedForAction(files, ActionType.Move);
    this.toast.show(
      'File Move Initialized',
      files.length === 1
        ? `Selected '${files[0].fileName}' for moving. Navigate to the target folder and paste the file there.`
        : `Selected ${files.length} files for moving. Navigate to the target folder and paste the files there.`,
      MessageSeverity.info
    );
  }

  initFileCopy(files: AppFile[]) {
    this.fileService.setFilesMarkedForAction(files, ActionType.Copy);
    this.toast.show(
      'File Copy Initialized',
      files.length === 1
        ? `Selected '${files[0].fileName}' for copying. Navigate to the target folder and paste the file there.`
        : `Selected ${files.length} files for copying. Navigate to the target folder and paste the files there.`,
      MessageSeverity.info
    );
  }

  // Drag and drop logic for moving and uploading files
  private readonly fileMoveDragPreview = viewChild(DragPreviewComponent, {
    read: ElementRef,
  });
  private readonly dragDrop = inject(FileDragDropService);
  readonly uploadDragDrop = inject(FileUploadDragDropService);
  readonly dragOverFileId = computed(() =>
    this.dragDrop.dragOverTarget()?.type === 'file'
      ? this.dragDrop.dragOverTarget()?.id
      : null
  );
  readonly fileUploadDragOverFileId = computed(
    () => this.uploadDragDrop.hoveredTarget()?.target?.id
  );
  readonly fileUploadTarget = this.uploadDragDrop.uploadTarget;
  readonly fileUploadHoverTargetCorrect = computed(
    () =>
      this.uploadDragDrop.hoveredTarget() &&
      this.uploadDragDrop.hoveredTarget()?.target?.id ===
        this.uploadDragDrop.uploadTarget()?.id
  );
  readonly fileUpladFileNb = this.uploadDragDrop.filesNb;
  readonly fileUploadTableTarget = computed(
    () => this.uploadDragDrop.hoveredTarget()?.type === 'table'
  );
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

    event.dataTransfer?.setData(
      'application/json',
      JSON.stringify(draggedFiles)
    );
    event.dataTransfer!.effectAllowed = 'move';

    const previewEl = this.fileMoveDragPreview()?.nativeElement
      .firstElementChild as HTMLElement;
    if (previewEl) {
      event.dataTransfer!.setDragImage(previewEl, 0, 0);
    }
  }

  onRowDragEnter(event: DragEvent, row: AppFile) {
    event.preventDefault();

    if (this.uploadDragDrop.allowExternalFiles(event)) {
      if (row.isDirectory) {
        event.stopPropagation();
        this.uploadDragDrop.setHoverTarget(
          { type: 'directory', target: row },
          event
        );
      }
    } else if (this.dragDrop.allowAppFiles(event)) {
      this.dragDrop.setDragOverTarget('file', row.id);
      this.dragDrop.setDropEffect(event, true);
    }
  }

  onRowDragOver(event: DragEvent, row: AppFile) {
    event.preventDefault();
    this.dragDrop.setDropEffect(
      event,
      this.dragDrop.allowAppFiles(event) ||
        this.uploadDragDrop.allowExternalFiles(event)
    );
  }

  onRowDragLeave(event: DragEvent, file: AppFile) {
    event.preventDefault();
    if (!DragDropUtils.isTrueDragLeave(event)) return;

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
      const destinationId = this.uploadDragDrop.getDestinationFolder(
        targetFile,
        this.currentDirectoryId()
      );
      await this.uploadDragDrop.uploadDraggedFiles(event, destinationId);
      return;
    }

    // Internal files
    if (this.dragDrop.allowAppFiles(event)) {
      const draggedFiles = this.dragDrop.draggedFiles();
      this.dragDrop.clearDrag();
      if (!targetFile.isDirectory || targetFile.checked) return;
      this.fileService.moveFilesWithFeedback(
        draggedFiles,
        targetFile.id,
        targetFile.fileName
      );
    }
  }

  onTableDragEnter(event: DragEvent) {
    event.preventDefault();

    if (this.uploadDragDrop.allowExternalFiles(event)) {
      this.uploadDragDrop.setHoverTarget(
        { type: 'table', target: null },
        event
      );
    }
  }

  onTableDragOver(event: DragEvent) {
    event.preventDefault();
    this.dragDrop.setDropEffect(
      event,
      this.dragDrop.allowAppFiles(event) ||
        this.uploadDragDrop.allowExternalFiles(event)
    );
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
    if (!DragDropUtils.isTrueDragLeave(event)) return;

    if (this.uploadDragDrop.hoveredTarget()?.type === 'table') {
      this.uploadDragDrop.clearHover();
    }
  }

  stopFilesUpload(files: AppFile[]) {
    files.forEach(this.stopFileUpload.bind(this));
  }

  stopFileUpload(file: AppFile) {
    if (file.progressStatus !== ProgressStatus.Started) return;
    file.progressStatus = ProgressStatus.Stopping;
    this.uploadService.pause(file.id);
  }

  continueFilesUpload(files: AppFile[]) {
    files.forEach(this.continueFileUpload.bind(this));
  }

  continueFileUpload(file: AppFile) {
    if (file.progressStatus !== ProgressStatus.Stopped) return;
    this.uploadService.resume(file, this.currentDirectoryId());
  }

  getFileSize(fileSize: string) {
    return +fileSize.split(' ')[0];
  }

  async cancelFilesUpload(files: AppFile[]) {
    const incompleteFiles = files.filter(
      (file) => file.fileStatus === FileStatus.Incomplete
    );
    if (await this.fileService.deleteFilesWithFeedback(incompleteFiles))
      incompleteFiles.forEach((file) => this.uploadService.cancel(file.id));
  }

  async cancelUpload(file: AppFile) {
    if (file.fileStatus !== FileStatus.Incomplete) return;
    if (await this.fileService.deleteFilesWithFeedback([file]))
      this.uploadService.cancel(file.id);
  }
}
