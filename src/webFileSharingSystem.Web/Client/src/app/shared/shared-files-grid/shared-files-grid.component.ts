import { CdkTableModule } from '@angular/cdk/table';
import { CommonModule } from '@angular/common';
import {
  Component,
  computed,
  ElementRef,
  inject,
  signal,
  TrackByFunction,
  viewChild,
  viewChildren,
} from '@angular/core';
import {
  NgbTooltipModule,
  NgbDropdownModule,
  NgbTooltip,
} from '@ng-bootstrap/ng-bootstrap';
import { TimeagoModule } from 'ngx-timeago';
import { FileStatus, ProgressStatus } from '../../core/models/base-file.model';
import { ShareAccessMode } from '../../core/models/share-access-mode.model';
import { SharedFile } from '../../core/models/shared-file.model';
import { MessageSeverity } from '../../core/models/toast-info.model';
import { DownloadService } from '../../core/services/download.service';
import { DragDropService } from '../../core/services/drag-drop.service';
import { GridSelectionService } from '../../core/services/grid-selection.service';
import { FileUploadService } from '../../core/services/file-upload.service';
import { FileService } from '../../core/services/file.service';
import { ModalService } from '../../core/services/modal.service';
import { SelectionService } from '../../core/services/selection.service';
import { ToastService } from '../../core/services/toast.service';
import { generateUniqueDirName } from '../../core/utils/file-utils';
import { DragPreviewComponent } from '../drag-preview/drag-preview.component';
import { SharedFilesContextMenuComponent } from '../shared-files-table/shared-files-context-menu/shared-files-context-menu.component';
import { TableContextMenuComponent } from '../table-context-menu/table-context-menu.component';
import { UploadOverlayComponent } from '../upload-overlay/upload-overlay.component';
import { SharedFileGridCardComponent } from './shared-file-grid-card/shared-file-grid-card.component';
import { AuthenticationService } from '../../core/services/authentication.service';
import { StateService } from '../../core/services/state.service';

@Component({
  selector: 'app-shared-files-grid',
  imports: [
    CommonModule,
    NgbTooltipModule,
    NgbDropdownModule,
    TimeagoModule,
    SharedFilesContextMenuComponent,
    DragPreviewComponent,
    CdkTableModule,
    UploadOverlayComponent,
    TableContextMenuComponent,
    SharedFileGridCardComponent,
  ],
  providers: [GridSelectionService<SharedFile>],
  templateUrl: './shared-files-grid.component.html',
  styleUrl: './shared-files-grid.component.scss',
  host: {
    class: 'd-block h-100',
    '(window:keydown)': 'onKeydown($event)',
  },
})
export class SharedFilesGridComponent {
  readonly FileStatus = FileStatus;
  readonly ProgressStatus = ProgressStatus;
  private readonly fileService = inject(FileService);
  private readonly uploadService = inject(FileUploadService);
  private readonly downloadService = inject(DownloadService);
  private readonly selection = inject(SelectionService<SharedFile>);
  private readonly gridSelection = inject(GridSelectionService<SharedFile>);
  private readonly dragFacade = inject(DragDropService<SharedFile>);
  private readonly modalService = inject(ModalService);
  private readonly authService = inject(AuthenticationService);
  private readonly toast = inject(ToastService);
  readonly editingId = this.fileService.editingId;
  readonly loadingIds = this.fileService.loadingIds;
  readonly canPaste = computed(
    () =>
      !!this.fileService.awaitingActionState() &&
      this.fileService.isParentMinWriteAccess(),
  );
  readonly currentDirectoryAccessMode = computed(
    () => this.fileService.parentBreadcrumb()?.accessMode,
  );
  readonly sortOption = this.fileService.sortOption;
  readonly viewMode = inject(StateService).viewMode;

  constructor() {
    this.selection.setScrollContainer(this.scrollContainer);
  }

  toggleSort(column: string) {
    this.fileService.toggleSort(column);
  }

  currentUserId = computed(() => this.authService.currentUser()?.id);

  columnsToDisplay = signal<(keyof SharedFile | (string & {}))[]>([
    'rowSelector',
    'fileName',
    'sharedBy/createdBy',
    'accessMode',
    'actions',
    'size',
    'validUntil',
  ]);

  sortableColumns = computed(() => [
    { column: 'fileName', displayName: 'File name' },
    {
      column: 'sharedBy/createdBy',
      displayName: this.currentDirectoryId() ? 'Created By' : 'Shared By',
    },
    { column: 'accessMode', displayName: 'Access Mode' },
    { column: 'size', displayName: 'Size' },
    { column: 'validUntil', displayName: 'Valid Until' },
  ]);

  files = this.fileService.sharedFiles;
  selectedIds = this.selection.selectedIds;
  selectedFiles = this.selection.selectedItems;
  filesMarkedForAction = this.fileService.awaitingActionState;
  areAllCheckboxesChecked = computed(
    () =>
      this.files().length > 0 &&
      this.selectedIds().size === this.files().length,
  );
  movableSelectedFiles = computed(() =>
    (this.selectedFiles() as SharedFile[]).filter((file) => this.canMove(file)),
  );
  canMoveSelected = computed(() => this.movableSelectedFiles().length > 0);

  tooltips = viewChildren(NgbTooltip);
  contextMenu = viewChild(SharedFilesContextMenuComponent);
  tableContextMenu = viewChild(TableContextMenuComponent);
  scrollContainer = viewChild<ElementRef<HTMLElement>>('scrollContainer');
  contextMenuPosition = signal<{ x: number; y: number }>({ x: 0, y: 0 });

  currentDirectoryId = this.fileService.parentId;
  trackByFileId: TrackByFunction<SharedFile> = (_, file) => file.id;

  isSelected(id: number): boolean {
    return this.selection.isSelected(id);
  }

  async openLocation(file: SharedFile) {
    this.fileService.goToFolder(file.parentId);
    await this.fileService.waitForNextCurrentReload();
    this.selection.scrollToId(file.id);
  }

  isEditing(id: number): boolean {
    return this.editingId() === id;
  }

  isLoading(id: number): boolean {
    return this.loadingIds().has(id);
  }

  onKeydown(event: KeyboardEvent) {
    const target = event.target as HTMLElement;
    if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA') return;

    if (
      (event.ctrlKey || event.metaKey) &&
      event.shiftKey &&
      event.key.toLowerCase() === 'n'
    ) {
      event.preventDefault();
      this.createFolder();
      return;
    }

    if (event.key === 'F2') {
      event.preventDefault();
      const selected = this.selectedFiles();
      if (selected.length === 1) {
        this.renameFile(selected[0] as SharedFile);
      }
      return;
    }

    if (event.key === 'Delete') {
      event.preventDefault();
      const selected = this.selectedFiles();
      if (selected.length > 0) {
        this.deleteFiles(selected as SharedFile[]);
      }
      return;
    }

    if (event.key === 'Enter') {
      const selected = this.selectedFiles() as SharedFile[];
      if (selected.length === 1 && selected[0].isDirectory) {
        event.preventDefault();
        this.selectFolder(selected[0].id);
      }
      return;
    }

    this.gridSelection.onKeydown(event, this.files, this.scrollContainer);
  }

  checkAllCheckBox(ev: Event) {
    const target = ev.target as HTMLInputElement;
    this.selection.toggleAll(target.checked);
  }

  selectFile(file: SharedFile, event: MouseEvent) {
    this.selection.selectRow(file, event);
  }

  resetFileSelection(event: MouseEvent) {
    if (this.selection.dragActive()) return;
    const target = event.target as HTMLElement;
    if (target.closest('app-shared-file-grid-card')) {
      return;
    }

    this.selection.clear();
  }

  onRowMouseDown(row: SharedFile, event: MouseEvent) {
    this.selection.onRowMouseDown(row, event);
  }

  onRowMouseEnter(row: SharedFile) {
    this.selection.onRowMouseEnter(row);
  }

  onRowMouseUp(row: SharedFile, event: MouseEvent) {
    this.selection.onRowMouseUp(row, event);
  }

  selectFolder(folderId: number) {
    this.fileService.goToFolder(folderId);
  }

  // Rename file
  async renameFile(file: SharedFile) {
    const newFileName = await this.modalService.getNewFileName({
      startName: file.fileName,
      blacklistedNames: new Set(
        [...this.fileService.names()].filter((name) => name !== file.fileName),
      ),
    });

    if (!newFileName) return;
    if (newFileName === file.fileName) return;

    this.fileService.renameFileWithFeedback(file, newFileName);
  }

  downloadFiles(files: SharedFile[]) {
    this.downloadService.downloadFilesWithFeedback(files);
  }

  contextMenuClick(event: MouseEvent, file: SharedFile) {
    event.preventDefault();
    event.stopPropagation();
    const position = { x: event.clientX, y: event.clientY };
    if (!this.selectedFiles().includes(file)) {
      this.selectedIds.set(new Set([file.id]));
    }

    this.openContextMenu(position);
  }

  tableContextMenuClick(event: MouseEvent) {
    event.preventDefault();
    event.stopPropagation();
    this.selection.clear();
    const position = { x: event.clientX, y: event.clientY };

    this.openTableContextMenu(position);
  }

  actionIconClick(event: MouseEvent, icon: HTMLElement, file: SharedFile) {
    event.stopPropagation();

    const rect = icon.getBoundingClientRect();
    const position = { x: rect.right, y: rect.bottom - rect.height / 4 };
    this.selectedIds.set(new Set([file.id]));

    this.openContextMenu(position);
  }

  refresh() {
    location.reload();
  }

  pasteFiles() {
    this.fileService.pasteFilesWithFeedback((ids) => {
      this.selection.selectedIds.set(ids);
      if (ids.size > 0) {
        this.selection.scrollToId(Array.from(ids).pop()!);
      }
    });
  }

  uploadFiles($event: File[]) {
    const filesWithPath: { file: File; path: string }[] = $event.map(
      (file) => ({
        file: file,
        path: '',
      }),
    );
    this.uploadService
      .uploadFiles([], filesWithPath, this.fileService.parentId())
      .subscribe();
  }

  async createFolder() {
    const newDirName = await this.modalService.getNewDirectoryName({
      startName: generateUniqueDirName(this.fileService.names()),
      blacklistedNames: this.fileService.names(),
    });

    if (!newDirName) return;

    this.fileService.createDirectoryWithFeedback(newDirName, (id) => {
      this.selection.selectedIds.set(new Set([id]));
      this.selection.scrollToId(id);
    });
  }

  private openContextMenu(position: { x: number; y: number }) {
    this.contextMenu()?.close();
    this.tableContextMenu()?.close();
    this.contextMenuPosition.set(position);
    this.contextMenu()?.open();
  }

  private openTableContextMenu(position: { x: number; y: number }) {
    this.contextMenu()?.close();
    this.tableContextMenu()?.close();
    this.contextMenuPosition.set(position);
    this.tableContextMenu()?.open();
  }

  deleteFiles(files: SharedFile[]) {
    this.fileService.deleteFilesWithFeedback(files);
  }

  initFileMove(files: SharedFile[]) {
    this.fileService.markFilesToMoveWithFeedback(files);
  }

  initFileCopy(files: SharedFile[]) {
    this.fileService.markFilesToCopyWithFeedback(files);
  }

  // Drag and drop logic for moving and uploading files
  private readonly fileMoveDragPreview = viewChild(DragPreviewComponent, {
    read: ElementRef,
  });

  readonly dragTarget = this.dragFacade.dragTarget;
  readonly isInternalHover = this.dragFacade.isInternalHover;
  readonly canWriteToDragTarget = this.dragFacade.hasMinWriteAccess;
  readonly dragPayloadNb = this.dragFacade.filesNb;
  readonly isHoverTargetATable = this.dragFacade.isHoverTargetATable;

  canBeTargetDirectory(file: SharedFile) {
    return file.isDirectory && !this.isSelected(file.id);
  }

  onRowDragStart(event: DragEvent, file: SharedFile) {
    const previewEl = this.fileMoveDragPreview()?.nativeElement
      .firstElementChild as HTMLElement | null;

    this.dragFacade.rowDragStart(event, file, this.selectedFiles(), previewEl);

    // Unselect files that cannot be moved to avoid confusion during drag
    if (this.movableSelectedFiles().length !== this.selectedFiles().length) {
      this.toast.show(
        'File move',
        'Unsellected files that cannot be moved',
        MessageSeverity.info,
      );

      this.selectedIds.set(
        new Set(this.movableSelectedFiles().map((f) => f.id)),
      );
    }
  }

  onRowDragEnter(event: DragEvent, row: SharedFile) {
    this.dragFacade.rowDragEnter(event, row);
  }

  onRowDragOver(event: DragEvent) {
    this.dragFacade.rowDragOver(event);
  }

  onRowDragLeave(event: DragEvent, file: SharedFile) {
    this.dragFacade.rowDragLeave(event, file);
  }

  onRowDragEnd(event: DragEvent) {
    this.dragFacade.rowDragEnd(event);
  }

  async onRowDrop(event: DragEvent) {
    await this.dragFacade.rowDrop(event);
  }

  onTableDragEnter(event: DragEvent) {
    this.dragFacade.tableDragEnter(event);
  }

  onTableDragOver(event: DragEvent) {
    this.dragFacade.tableDragOver(event);
  }

  async onTableDrop(event: DragEvent) {
    await this.dragFacade.rowDrop(event);
  }

  onTableDragLeave(event: DragEvent) {
    this.dragFacade.tableDragLeave(event);
  }

  // File upload controls
  stopFilesUpload(files: SharedFile[]) {
    const uploadingFiles = files.filter(
      (file) => file.progressStatus === ProgressStatus.Started,
    );
    uploadingFiles.forEach((file) => this.uploadService.pause(file.id));
  }

  continueFilesUpload(files: SharedFile[]) {
    const stoppedFiles = files.filter(
      (file) => file.progressStatus === ProgressStatus.Stopped,
    );
    stoppedFiles.forEach((file) =>
      this.uploadService.resume(file, this.currentDirectoryId()),
    );
  }

  async cancelFilesUpload(files: SharedFile[]) {
    const incompleteFiles = files.filter(
      (file) => file.fileStatus === FileStatus.Incomplete,
    );
    if (await this.fileService.deleteFilesWithFeedback(incompleteFiles))
      incompleteFiles.forEach((file) => this.uploadService.cancel(file.id));
  }

  getFileSize(fileSize: string) {
    return +fileSize.split(' ')[0];
  }

  canMove(file: SharedFile): boolean {
    return (
      file.fileStatus === FileStatus.Completed &&
      file.accessMode! >= ShareAccessMode.ReadWrite
    );
  }
}
