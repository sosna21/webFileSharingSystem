import { CommonModule } from '@angular/common';
import {
  Component,
  computed,
  ElementRef,
  inject,
  Injector,
  signal,
  TrackByFunction,
  viewChild,
  viewChildren,
} from '@angular/core';
import { AppFile } from '../../core/models/app-file.model';
import { FileStatus, ProgressStatus } from '../../core/models/base-file.model';
import { AuthenticationService } from '../../core/services/authentication.service';
import { DragDropService } from '../../core/services/drag-drop.service';
import { FileService } from '../../core/services/file.service';
import { GridSelectionService } from '../../core/services/grid-selection.service';
import { SelectionService } from '../../core/services/selection.service';
import { UploadOverlayComponent } from '../upload-overlay/upload-overlay.component';
import { UserFileGridCardComponent } from './user-file-grid-card/user-file-grid-card.component';
import { UserFilesContextMenuComponent } from '../user-files-table/user-files-context-menu/user-files-context-menu.component';
import { TableContextMenuComponent } from '../table-context-menu/table-context-menu.component';
import { DragPreviewComponent } from '../drag-preview/drag-preview.component';
import { CdkTableModule } from '@angular/cdk/table';
import {
  NgbTooltipModule,
  NgbDropdownModule,
  NgbTooltip,
} from '@ng-bootstrap/ng-bootstrap';
import { DownloadService } from '../../core/services/download.service';
import { FileShareService } from '../../core/services/file-share.service';
import { FileUploadService } from '../../core/services/file-upload.service';
import { ModalService } from '../../core/services/modal.service';
import { generateUniqueDirName } from '../../core/utils/file-utils';
import { StateService } from '../../core/services/state.service';

@Component({
  selector: 'app-user-files-grid',
  imports: [
    CommonModule,
    UserFileGridCardComponent,
    UploadOverlayComponent,
    UserFilesContextMenuComponent,
    TableContextMenuComponent,
    DragPreviewComponent,
    CommonModule,
    NgbTooltipModule,
    NgbDropdownModule,
    UserFilesContextMenuComponent,
    DragPreviewComponent,
    CdkTableModule,
    UploadOverlayComponent,
    TableContextMenuComponent,
  ],
  providers: [GridSelectionService<AppFile>],
  templateUrl: './user-files-grid.component.html',
  styleUrl: './user-files-grid.component.scss',
  host: {
    class: 'd-block h-100',
    '(window:keydown)': 'onKeydown($event)',
  },
})
export class UserFilesGridComponent {
  readonly FileStatus = FileStatus;
  readonly ProgressStatus = ProgressStatus;
  private readonly fileService = inject(FileService);
  private readonly uploadService = inject(FileUploadService);
  private readonly downloadService = inject(DownloadService);
  private readonly authService = inject(AuthenticationService);
  private readonly shareService = inject(FileShareService);
  private readonly modalService = inject(ModalService);
  private readonly injector = inject(Injector);
  private readonly selection = inject(SelectionService<AppFile>);
  private readonly gridSelection = inject(GridSelectionService<AppFile>);
  private readonly dragFacade = inject(DragDropService<AppFile>);
  readonly editingId = this.fileService.editingId;
  readonly loadingIds = this.fileService.loadingIds;
  readonly canPaste = computed(() => !!this.fileService.awaitingActionState());
  readonly sortOption = this.fileService.sortOption;
  readonly currentDirectoryAccessMode = computed(
    () => this.fileService.parentBreadcrumb()?.accessMode,
  );
  readonly viewMode = inject(StateService).viewMode;

  constructor() {
    this.selection.setScrollContainer(this.scrollContainer);
  }

  toggleSort(column: string) {
    this.fileService.toggleSort(column);
  }

  sortableColumns = computed(() => [
    { column: 'fileName', displayName: 'File name' },
    { column: 'favourite', displayName: 'Favourite' },
    { column: 'share', displayName: 'Share' },
    { column: 'size', displayName: 'Size' },
    { column: 'createdByUserName', displayName: 'Created By' },
    { column: 'lastModification', displayName: 'Last Modification' },
  ]);

  files = this.fileService.userFiles;
  selectedIds = this.selection.selectedIds;
  selectedFiles = this.selection.selectedItems;
  filesMarkedForAction = this.fileService.awaitingActionState;
  areAllCheckboxesChecked = computed(
    () =>
      this.files().length > 0 &&
      this.selectedIds().size === this.files().length,
  );
  currentUserId = computed(() => this.authService.currentUser()?.id);

  tooltips = viewChildren(NgbTooltip);
  contextMenu = viewChild(UserFilesContextMenuComponent);
  tableContextMenu = viewChild(TableContextMenuComponent);
  scrollContainer = viewChild<ElementRef<HTMLElement>>('scrollContainer');
  contextMenuPosition = signal<{ x: number; y: number }>({ x: 0, y: 0 });

  currentDirectoryId = this.fileService.parentId;
  trackByFileId: TrackByFunction<AppFile> = (_, file) => file.id;

  isSelected(id: number): boolean {
    return this.selection.isSelected(id);
  }

  async openLocation(file: AppFile) {
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
        this.renameFile(selected[0] as AppFile);
      }
      return;
    }

    if (event.key === 'Delete') {
      event.preventDefault();
      const selected = this.selectedFiles();
      if (selected.length > 0) {
        this.deleteFiles(selected as AppFile[]);
      }
      return;
    }

    if (event.key === 'Enter') {
      const selected = this.selectedFiles() as AppFile[];
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

  selectFile(file: AppFile, event: MouseEvent) {
    this.selection.selectRow(file, event);
  }

  resetFileSelection(event: MouseEvent) {
    if (this.selection.dragActive()) return;
    const target = event.target as HTMLElement;
    if (target.closest('app-user-file-grid-card')) {
      return;
    }

    this.selection.clear();
  }

  onRowMouseDown(row: AppFile, event: MouseEvent) {
    this.selection.onRowMouseDown(row, event);
  }

  onRowMouseEnter(row: AppFile) {
    this.selection.onRowMouseEnter(row);
  }

  onRowMouseUp(row: AppFile, event: MouseEvent) {
    this.selection.onRowMouseUp(row, event);
  }

  selectFolder(folderId: number) {
    this.fileService.goToFolder(folderId);
  }

  // Rename file
  async renameFile(file: AppFile) {
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

  changeFavourite(files: AppFile[], changeTo: boolean) {
    this.fileService.changeFilesFavouriteWithFeedback(files, changeTo);
    this.tooltips().forEach((t) => t.close());
  }

  downloadFiles(files: AppFile[]) {
    this.downloadService.downloadFilesWithFeedback(files);
  }

  async generateShareLink(files: AppFile[]) {
    await this.shareService.generateShareLinkWithFeedback(
      files.map((f) => f.id),
    );
  }

  showShareManagementModal(sharedFile: AppFile) {
    this.modalService.manageSharesModal(
      {
        sharedFile: sharedFile,
        title: `Manage shares for file: '${sharedFile.fileName}'`,
      },
      this.injector,
    );
  }

  shareFile(files: AppFile[]) {
    this.shareService.shareFilesWithFeedback(files);
  }

  contextMenuClick(event: MouseEvent, file: AppFile) {
    event.preventDefault();
    event.stopPropagation();
    const position = { x: event.clientX, y: event.clientY };
    if (file && !this.selectedFiles().includes(file)) {
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

  actionIconClick(event: MouseEvent, icon: HTMLElement, file: AppFile) {
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

  readonly dragTarget = this.dragFacade.dragTarget;
  readonly isInternalHover = this.dragFacade.isInternalHover;
  readonly canWriteToDragTarget = this.dragFacade.hasMinWriteAccess;
  readonly dragPayloadNb = this.dragFacade.filesNb;
  readonly isHoverTargetATable = this.dragFacade.isHoverTargetATable;

  canBeTargetDirectory(file: AppFile) {
    return file.isDirectory && !this.isSelected(file.id);
  }

  onRowDragStart(event: DragEvent, file: AppFile) {
    const previewEl = this.fileMoveDragPreview()?.nativeElement
      .firstElementChild as HTMLElement | null;
    this.dragFacade.rowDragStart(event, file, this.selectedFiles(), previewEl);
  }

  onRowDragEnter(event: DragEvent, row: AppFile) {
    this.dragFacade.rowDragEnter(event, row);
  }

  onRowDragOver(event: DragEvent) {
    this.dragFacade.rowDragOver(event);
  }

  onRowDragLeave(event: DragEvent, file: AppFile) {
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
  stopFilesUpload(files: AppFile[]) {
    const uploadingFiles = files.filter(
      (file) => file.progressStatus === ProgressStatus.Started,
    );
    uploadingFiles.forEach((file) => this.uploadService.pause(file.id));
  }

  continueFilesUpload(files: AppFile[]) {
    const stoppedFiles = files.filter(
      (file) => file.progressStatus === ProgressStatus.Stopped,
    );
    stoppedFiles.forEach((file) =>
      this.uploadService.resume(file, this.currentDirectoryId()),
    );
  }

  async cancelFilesUpload(files: AppFile[]) {
    const incompleteFiles = files.filter(
      (file) => file.fileStatus === FileStatus.Incomplete,
    );
    if (await this.fileService.deleteFilesWithFeedback(incompleteFiles))
      incompleteFiles.forEach((file) => this.uploadService.cancel(file.id));
  }

  getFileSize(fileSize: string) {
    return +fileSize.split(' ')[0];
  }
}
