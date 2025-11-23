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
import { FileShareService } from '../../../core/services/file-share.service';
import { FileUploadService } from '../../../core/services/file-upload.service';
import { FileService } from '../../../core/services/file.service';
import { ModalService } from '../../../core/services/modal.service';
import { BaseTableContextMenuComponent } from './base-table-context-menu/base-table-context-menu.component';
import { DragPreviewComponent } from './drag-preview/drag-preview.component';
import { CdkTableModule } from '@angular/cdk/table';
import { SelectionService } from '../../../core/services/selection.service';
import { TableDragDropFacade } from '../../../core/services/table-drag-drop-facade.service';

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
  providers: [TableDragDropFacade],
})
export class MyFilesComponent {
  readonly FileStatus = FileStatus;
  readonly ProgressStatus = ProgressStatus;
  private readonly fileService = inject(FileService);
  private readonly uploadService = inject(FileUploadService);
  private readonly downloadService = inject(DownloadService);
  private readonly shareService = inject(FileShareService);
  private readonly modalService = inject(ModalService);
  private readonly selection = inject(SelectionService<AppFile>);
  private readonly dragFacade = inject(TableDragDropFacade<AppFile>);
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
  files = this.fileService.files;
  selectedIds = this.selection.selectedIds;
  selectedFiles = this.selection.selectedItems;
  filesMarkedForAction = this.fileService.waitingForAction;
  areAllCheckboxesChecked = computed(
    () =>
      this.files().length > 0 && this.selectedIds().size === this.files().length
  );

  tooltips = viewChildren(NgbTooltip);
  contextMenu = viewChild(BaseTableContextMenuComponent);
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

  onRowMouseDown(row: AppFile, event: MouseEvent) {
    this.selection.onRowMouseDown(row, event);
  }

  onRowMouseEnter(row: AppFile) {
    this.selection.onRowMouseEnter(row);
  }

  onRowMouseUp(row: AppFile) {
    this.selection.onRowMouseUp(row);
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

  readonly dragOverFileId = this.dragFacade.dragOverFileId;
  readonly fileUploadDragOverFileId = this.dragFacade.fileUploadDragOverFileId;
  readonly fileUploadTarget = this.dragFacade.fileUploadTarget;
  readonly fileUploadHoverTargetCorrect =
    this.dragFacade.fileUploadHoverTargetCorrect;
  readonly fileUploadFileNb = this.dragFacade.fileUploadFileNb;
  readonly fileUploadTableTarget = this.dragFacade.fileUploadTableTarget;

  canBeTargetDirectory(file: AppFile) {
    return file.isDirectory && !this.isSelected(file.id);
  }

  onRowDragStart(event: DragEvent, file: AppFile) {
    const previewEl = this.fileMoveDragPreview()?.nativeElement
      .firstElementChild as HTMLElement | null;
    this.dragFacade.rowDragStart(
      event,
      file,
      this.isSelected.bind(this),
      this.selectedFiles,
      previewEl
    );
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
    await this.dragFacade.rowDrop(
      event,
      targetFile,
      this.currentDirectoryId,
      this.isSelected.bind(this),
      (files, targetId, targetName) =>
        this.fileService.moveFilesWithFeedback(files, targetId, targetName)
    );
  }

  onTableDragEnter(event: DragEvent) {
    this.dragFacade.tableDragEnter(event);
  }

  onTableDragOver(event: DragEvent) {
    this.dragFacade.tableDragOver(event);
  }

  async onTableDrop(event: DragEvent) {
    await this.dragFacade.tableDrop(event, this.currentDirectoryId());
  }

  onTableDragLeave(event: DragEvent) {
    this.dragFacade.tableDragLeave(event);
  }

  // File upload controls
  stopFilesUpload(files: AppFile[]) {
    const uploadingFiles = files.filter(
      (file) => file.progressStatus === ProgressStatus.Started
    );
    uploadingFiles.forEach((file) => this.uploadService.pause(file.id));
  }

  continueFilesUpload(files: AppFile[]) {
    const stoppedFiles = files.filter(
      (file) => file.progressStatus === ProgressStatus.Stopped
    );
    stoppedFiles.forEach((file) =>
      this.uploadService.resume(file, this.currentDirectoryId())
    );
  }

  async cancelFilesUpload(files: AppFile[]) {
    const incompleteFiles = files.filter(
      (file) => file.fileStatus === FileStatus.Incomplete
    );
    if (await this.fileService.deleteFilesWithFeedback(incompleteFiles))
      incompleteFiles.forEach((file) => this.uploadService.cancel(file.id));
  }

  getFileSize(fileSize: string) {
    return +fileSize.split(' ')[0];
  }
}
