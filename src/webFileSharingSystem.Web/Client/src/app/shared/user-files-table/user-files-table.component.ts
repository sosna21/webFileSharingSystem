import { CdkTableModule } from '@angular/cdk/table';
import { CommonModule } from '@angular/common';
import {
  ChangeDetectionStrategy,
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
import {
  NgbTooltipModule,
  NgbDropdownModule,
  NgbTooltip,
} from '@ng-bootstrap/ng-bootstrap';
import { TimeagoModule } from 'ngx-timeago';
import { AppFile } from '../../core/models/app-file.model';
import { DownloadService } from '../../core/services/download.service';
import { FileShareService } from '../../core/services/file-share.service';
import { FileUploadService } from '../../core/services/file-upload.service';
import { FileService } from '../../core/services/file.service';
import { ModalService } from '../../core/services/modal.service';
import { SelectionService } from '../../core/services/selection.service';
import { DragDropService } from '../../core/services/drag-drop.service';
import { DragPreviewComponent } from '../drag-preview/drag-preview.component';
import { UserFilesContextMenuComponent } from './user-files-context-menu/user-files-context-menu.component';
import { FileStatus, ProgressStatus } from '../../core/models/base-file.model';
import { UploadOverlayComponent } from '../upload-overlay/upload-overlay.component';
import { TableContextMenuComponent } from '../table-context-menu/table-context-menu.component';
import { generateUniqueDirName } from '../../core/utils/file-utils';
import { FileNameCellComponent } from '../table-cells/file-name-cell/file-name-cell.component';
import { RowSelectorCellComponent } from '../table-cells/row-selector-cell/row-selector-cell.component';
import { ActionsCellComponent } from '../table-cells/actions-cell/actions-cell.component';
import { SizeCellComponent } from '../table-cells/size-cell/size-cell.component';
import { FavouriteCellComponent } from '../table-cells/favourite-cell/favourite-cell.component';
import { LastModificationCellComponent } from '../table-cells/last-modification-cell/last-modification-cell.component';
import { ShareCellComponent } from '../table-cells/share-cell/share-cell.component';
import { CreatedByCellComponentt } from '../table-cells/created-by-cell/created-by-cell.component';
import { AuthenticationService } from '../../core/services/authentication.service';

@Component({
  selector: 'app-user-files-table',
  imports: [
    CommonModule,
    NgbTooltipModule,
    NgbDropdownModule,
    TimeagoModule,
    UserFilesContextMenuComponent,
    DragPreviewComponent,
    CdkTableModule,
    UploadOverlayComponent,
    TableContextMenuComponent,
    FileNameCellComponent,
    RowSelectorCellComponent,
    ActionsCellComponent,
    SizeCellComponent,
    FavouriteCellComponent,
    ShareCellComponent,
    LastModificationCellComponent,
    CreatedByCellComponentt,
  ],
  templateUrl: './user-files-table.component.html',
  styleUrl: './user-files-table.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    class: 'h-100',
    style: 'max-height: 100%; min-height: 400px',
    '(window:keydown)': 'onKeydown($event)',
  },
})
export class UserFilesTableComponent {
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
  private readonly dragFacade = inject(DragDropService<AppFile>);
  readonly editingId = this.fileService.editingId;
  readonly loadingIds = this.fileService.loadingIds;
  readonly canPaste = computed(() => !!this.fileService.awaitingActionState());

  columnsToDisplay = signal<(keyof AppFile | (string & {}))[]>([
    'rowSelector',
    'fileName',
    'favourite',
    'share',
    'actions',
    'size',
    'createdByUserName',
    'lastModification',
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
  contextMenuPosition = signal<{ x: number; y: number }>({ x: 0, y: 0 });

  currentDirectoryId = this.fileService.parentId;
  trackByFileId: TrackByFunction<AppFile> = (_, file) => file.id;

  isSelected(id: number): boolean {
    return this.selection.isSelected(id);
  }

  isEditing(id: number): boolean {
    return this.editingId() === id;
  }

  isLoading(id: number): boolean {
    return this.loadingIds().has(id);
  }

  onKeydown(event: KeyboardEvent) {
    this.selection.onKeydown(event);
  }

  checkAllCheckBox(ev: Event) {
    const target = ev.target as HTMLInputElement;
    this.selection.toggleAll(target.checked);
  }

  selectFile(file: AppFile, event: MouseEvent) {
    this.selection.selectRow(file, event);
  }

  resetFileSelection(event: MouseEvent) {
    const target = event.target as HTMLElement;
    if (target.closest('tr')) {
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
    this.fileService.pasteFilesWithFeedback();
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

    this.fileService.createDirectoryWithFeedback(
      newDirName,
      this.selection.selectedIds.set,
    );
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

  async onRowDrop(event: DragEvent, targetFile: AppFile) {
    if (!this.canBeTargetDirectory(targetFile)) return;

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
