import { CommonModule, DecimalPipe } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  computed,
  ElementRef,
  inject,
  signal,
  TrackByFunction,
  viewChild,
  viewChildren,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import {
  NgbTooltipModule,
  NgbDropdownModule,
  NgbProgressbarModule,
  NgbTooltip,
} from '@ng-bootstrap/ng-bootstrap';
import { TimeagoModule } from 'ngx-timeago';
import { ClicableIconDirective } from '../../../core/directives/clicable-icon.directive';
import { SelectFilenameDirective } from '../../../core/directives/select-filename.directive';
import {
  FileStatus,
  ProgressStatus,
  AppFile,
} from '../../../core/models/app-file.model';
import { FileSizePipe } from '../../../core/pipes/file-size.pipe';
import { FileToIconPipe } from '../../../core/pipes/file-to-icon.pipe';
import { DownloadService } from '../../../core/services/download.service';
import { FileDragDropService } from '../../../core/services/file-drag-drop.service';
import { FileShareService } from '../../../core/services/file-share.service';
import { FileUploadDragDropService } from '../../../core/services/file-upload-drag-drop.service';
import { FileUploadService } from '../../../core/services/file-upload.service';
import { FileService } from '../../../core/services/file.service';
import { ModalService } from '../../../core/services/modal.service';
import { ToastService } from '../../../core/services/toast.service';
import { DragDropUtils } from '../../../core/utils/drag-drop-utils';
import { BaseTableContextMenuComponent } from './base-table-context-menu/base-table-context-menu.component';
import { DragPreviewComponent } from './drag-preview/drag-preview.component';
import { CdkTableModule } from '@angular/cdk/table';

@Component({
  selector: 'app-my-files',
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
    CdkTableModule,
  ],
  templateUrl: './my-files.component.html',
  styleUrl: './my-files.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    class: 'h-100',
    style: 'max-height: 100%; min-height: 400px',
    '(window:keydown)': 'onKeydown($event)',
  },
})
export class MyFilesComponent {
  readonly FileStatus = FileStatus;
  readonly ProgressStatus = ProgressStatus;
  private readonly fileService = inject(FileService);
  private readonly downloadService = inject(DownloadService);
  private readonly uploadService = inject(FileUploadService);
  private readonly shareService = inject(FileShareService);
  private readonly modalService = inject(ModalService);
  readonly singleSelect = signal(false);
  readonly fileSelectionBeforeDragIds = signal<Set<number>>(new Set());
  readonly selectedIds = this.fileService.selectedIds;
  readonly editingId = this.fileService.editingId;
  readonly loadingIds = this.fileService.loadingIds;

  columnsToDisplay = signal<(keyof AppFile | (string & {}))[]>([
    'id',
    'rowSelector',
    'fileName',
    'favourite',
    'share',
    'actions',
    'size',
    'lastModification',
  ]);
  fileResource = this.fileService.fileResource;
  areAllCheckboxesChecked = computed(
    () =>
      this.files().length > 0 && this.selectedIds().size === this.files().length
  );
  files = this.fileService.files;
  selectedFiles = computed(() => {
    const ids = this.selectedIds();
    const list = this.files();
    return list.filter((f) => ids.has(f.id));
  });
  filesMarkedForAction = this.fileService.waitingForAction;

  tooltips = viewChildren(NgbTooltip);
  contextMenu = viewChild(BaseTableContextMenuComponent);
  contextMenuPosition = signal<{ x: number; y: number }>({ x: 0, y: 0 });

  currentDirectoryId = this.fileService.parentId;
  trackByFileId: TrackByFunction<AppFile> = (_, file) => file.id;
  readonly fileSelectionAnchorId = signal<number | null>(null);
  readonly dragSelectionAnchorId = signal<number | null>(null);
  readonly dragging = signal<null | 'standard' | 'ctrl' | 'shift'>(null);

  isSelected(id: number): boolean {
    return this.selectedIds().has(id);
  }

  isEditing(id: number): boolean {
    return this.editingId() === id;
  }

  isLoading(id: number): boolean {
    return this.loadingIds().has(id);
  }
  private setLoading(id: number, value: boolean) {
    this.fileService.setLoading(id, value);
  }

  onKeydown(event: KeyboardEvent) {
    const target = event.target as HTMLElement;

    // Allow Ctrl+A if the target is an input or textarea (for text selection)
    if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA') {
      return;
    }

    if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'a') {
      event.preventDefault();
      const all = new Set(this.files().map((f) => f.id));
      this.selectedIds.set(all);
    }
  }

  checkAllCheckBox(ev: Event) {
    const target = ev.target as HTMLInputElement;
    if (target.checked) {
      this.selectedIds.set(new Set(this.files().map((f) => f.id)));
    } else {
      this.selectedIds.set(new Set());
    }
  }

  onRowMouseDown(row: AppFile, event: MouseEvent) {
    if (
      event.button !== 0 ||
      this.singleSelect() ||
      (this.isSelected(row.id) && !(event.ctrlKey || event.shiftKey))
    )
      return; // left button only
    event.preventDefault();
    this.fileSelectionBeforeDragIds.set(new Set(this.selectedIds()));

    if (event.ctrlKey) {
      this.dragging.set('ctrl');
    } else if (event.shiftKey) {
      this.dragging.set('shift');
    } else {
      this.dragging.set('standard');
    }
    this.dragSelectionAnchorId.set(row.id);
  }

  onRowMouseEnter(row: AppFile) {
    if (!this.dragging() || !this.dragSelectionAnchorId()) return;
    this.dragSelectRows(row);
  }

  onRowMouseUp(row: AppFile) {
    if (!this.dragging() || !this.dragSelectionAnchorId()) return;
    if (this.dragSelectionAnchorId() === row.id) {
      this.endDragSelection();
      return;
    }

    this.dragSelectRows(row);
    this.endDragSelection();
  }

  private dragSelectRows(currentFile: AppFile) {
    this.fileSelectionAnchorId.set(currentFile.id);
    const anchorIndex = this.files().findIndex(
      (f) => f.id === this.dragSelectionAnchorId()
    );
    const currentIndex = this.files().findIndex((f) => f.id === currentFile.id);

    if (this.dragging() === 'shift') {
      const range = new Set(
        this.files()
          .filter(
            (_, index) =>
              index >= Math.min(anchorIndex, currentIndex) &&
              index <= Math.max(anchorIndex, currentIndex)
          )
          .map((f) => f.id)
      );
      this.selectedIds.update((prev) => new Set([...prev, ...range]));
    } else if (this.dragging() == 'ctrl') {
      const startSet = new Set(this.fileSelectionBeforeDragIds());
      const idsInRange = this.files()
        .filter(
          (_, index) =>
            index >= Math.min(anchorIndex, currentIndex) &&
            index <= Math.max(anchorIndex, currentIndex)
        )
        .map((f) => f.id);
      const next = new Set(startSet);
      idsInRange.forEach((id) => {
        if (next.has(id)) next.delete(id);
        else next.add(id);
      });
      this.selectedIds.set(next);
    } else {
      const rangeIds = this.files()
        .filter(
          (_, index) =>
            index >= Math.min(anchorIndex, currentIndex) &&
            index <= Math.max(anchorIndex, currentIndex)
        )
        .map((f) => f.id);
      this.selectedIds.set(new Set(rangeIds));
    }
  }

  private endDragSelection() {
    this.dragging.set(null);
    this.dragSelectionAnchorId.set(null);
    this.fileSelectionBeforeDragIds.set(new Set());
  }

  isFileUploadCompleted(file: AppFile) {
    return file.fileStatus === FileStatus.Completed;
  }

  selectFolder(folderId: number) {
    this.fileService.goToFolder(folderId);
  }

  // Rename file
  initRename(file: AppFile) {
    this.editingId.set(file.id);
  }

  rename(file: AppFile, newFileName: string) {
    this.fileService.renameFileWithFeedback(file, newFileName);
  }

  fileRenameKeyDown($event: KeyboardEvent, file: AppFile) {
    if ($event.key === 'Enter') {
      this.rename(file, ($event.target as HTMLInputElement).value);
    } else if ($event.key === 'Escape') {
      this.editingId.set(null);
    }
    $event.stopPropagation();
  }

  selectFile(file: AppFile, event: MouseEvent) {
    const isCtrl = event.ctrlKey || event.metaKey;
    const isShift = event.shiftKey;

    if (this.fileSelectionAnchorId() === null)
      this.fileSelectionAnchorId.set(this.files()[0].id);

    const localLastSelectedFileId = this.fileSelectionAnchorId();

    //if the shift key is pressed, we need to keep the last selected file id,
    // it will be used as an anchor for the selection
    if (!isShift) {
      this.fileSelectionAnchorId.set(file.id);
    }

    if (isShift) {
      const newFileIndex = this.files().findIndex((f) => f === file);
      const anchorIndex = this.files().findIndex(
        (f) => f.id === localLastSelectedFileId
      );
      const startIndex = Math.min(newFileIndex, anchorIndex);
      const endIndex = Math.max(newFileIndex, anchorIndex);
      const rangeIds = this.files()
        .filter((_, idx) => idx >= startIndex && idx <= endIndex)
        .map((f) => f.id);
      this.selectedIds.set(new Set(rangeIds));
      return;
    }

    if (isCtrl) {
      this.selectedIds.update((prev) => {
        const next = new Set(prev);
        if (next.has(file.id)) next.delete(file.id);
        else next.add(file.id);
        return next;
      });
      return;
    }

    // If no modifiers, select only this file
    this.selectedIds.set(new Set([file.id]));
  }

  changeFavourite(files: AppFile[], changeTo: boolean) {
    this.fileService.changeFilesFavouriteWithFeedback(files, changeTo);
    this.tooltips().forEach((t) => t.close());
  }

  downloadFiles(files: AppFile[]) {
    this.downloadService.downloadFilesWithFeedback(files);
  }

  async generateShareLink(files: AppFile[]) {
    await this.shareService.generateShareLinkWithFeedback(
      files.map((f) => f.id)
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
      this.selectedIds.set(new Set([file.id]));
    }

    this.openContextMenu(position);
  }

  actionIconClick(event: MouseEvent, icon: HTMLElement, file: AppFile) {
    event.stopPropagation();

    const rect = icon.getBoundingClientRect();
    const position = { x: rect.right, y: rect.bottom - rect.height / 4 };
    this.selectedIds.set(new Set([file.id]));

    this.openContextMenu(position);
  }

  private openContextMenu(position: { x: number; y: number }) {
    this.contextMenu()?.close();
    this.contextMenuPosition.set(position);
    this.contextMenu()?.open();
  }

  deleteFiles(files: AppFile[]) {
    this.fileService.deleteFilesWithFeedback(files);
  }

  initFileMove(files: AppFile[]) {
    this.fileService.markFilesToMoveWithFeedback(files);
  }

  initFileCopy(files: AppFile[]) {
    this.fileService.markFilesToCopyWithFeedback(files);
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
    return file.isDirectory && !this.isSelected(file.id);
  }

  onRowDragStart(event: DragEvent, file: AppFile) {
    if (!this.isSelected(file.id) || event.ctrlKey || event.shiftKey) {
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
      if (!targetFile.isDirectory || this.isSelected(targetFile.id)) return;
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
