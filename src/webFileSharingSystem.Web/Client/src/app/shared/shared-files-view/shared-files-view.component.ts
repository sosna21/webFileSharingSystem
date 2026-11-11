import { CommonModule } from '@angular/common';
import {
  Component,
  computed,
  inject,
  Injector,
  signal,
  viewChild,
} from '@angular/core';
import { FileStatus, ProgressStatus } from '../../core/models/base-file.model';
import { SharedFile } from '../../core/models/shared-file.model';
import { DragDropService } from '../../core/services/drag-drop.service';
import { DownloadService } from '../../core/services/download.service';
import { FileService } from '../../core/services/file.service';
import { FileUploadService } from '../../core/services/file-upload.service';
import { ModalService } from '../../core/services/modal.service';
import { SelectionService } from '../../core/services/selection.service';
import { StateService } from '../../core/services/state.service';
import { generateUniqueDirName } from '../../core/utils/file-utils';
import { SharedFilesGridComponent } from '../shared-files-grid/shared-files-grid.component';
import { SharedFilesTableComponent } from '../shared-files-table/shared-files-table.component';
import { SharedFilesContextMenuComponent } from '../shared-files-table/shared-files-context-menu/shared-files-context-menu.component';
import { TableContextMenuComponent } from '../table-context-menu/table-context-menu.component';
import { UploadOverlayComponent } from '../upload-overlay/upload-overlay.component';
import {
  SharedFilesContextMenuRequest,
  SharedFilesDirectoryMenuRequest,
  SharedFilesOperation,
} from './shared-files-view.types';
import { StorageService } from '../../core/services/storage.service';

const descendingFirstSortColumns = new Set(['size']);

@Component({
  selector: 'app-shared-files-view',
  imports: [
    CommonModule,
    SharedFilesTableComponent,
    SharedFilesGridComponent,
    SharedFilesContextMenuComponent,
    TableContextMenuComponent,
    UploadOverlayComponent,
  ],
  templateUrl: './shared-files-view.component.html',
  host: { class: 'd-block h-100' },
})
export class SharedFilesViewComponent {
  readonly storageService = inject(StorageService);
  readonly fileService = inject(FileService);
  readonly viewMode = inject(StateService).viewMode;
  readonly selectedFiles = inject(SelectionService<SharedFile>).selectedItems;
  readonly dragTarget = inject(DragDropService<SharedFile>).dragTarget;
  readonly isInternalHover = inject(DragDropService<SharedFile>)
    .isInternalHover;
  readonly contextMenuPosition = signal({ x: 0, y: 0 });
  readonly currentDirectoryAccessMode = computed(
    () => this.fileService.parentBreadcrumb()?.accessMode,
  );
  readonly canPaste = computed(
    () =>
      !!this.fileService.awaitingActionState() &&
      this.fileService.isParentMinWriteAccess(),
  );
  readonly sortOption = this.fileService.sortOption;
  readonly sortableColumns = computed(() => [
    { column: 'fileName', displayName: $localize`File name` },
    {
      column: 'sharedBy/createdBy',
      displayName: this.fileService.parentId()
        ? $localize`Created By`
        : $localize`Shared By`,
    },
    { column: 'accessMode', displayName: $localize`Access Mode` },
    { column: 'size', displayName: $localize`Size` },
    { column: 'validUntil', displayName: $localize`Valid Until` },
  ]);

  readonly fileContextMenu = viewChild(SharedFilesContextMenuComponent);
  readonly directoryContextMenu = viewChild(TableContextMenuComponent);

  private readonly uploadService = inject(FileUploadService);
  private readonly downloadService = inject(DownloadService);
  private readonly modalService = inject(ModalService);
  private readonly injector = inject(Injector);
  private readonly selection = inject(SelectionService<SharedFile>);

  openTableContextMenu() {
    this.openDirectoryMenu({ x: 0, y: 0 });
  }

  openFileContextMenu() {
    this.openFileMenu({ x: 0, y: 0 });
  }

  onFileContextMenu(request: SharedFilesContextMenuRequest) {
    request.event.preventDefault();
    request.event.stopPropagation();
    if (request.event.pointerType !== 'mouse') return;

    if (request.file && !this.selectedFiles().includes(request.file)) {
      this.selection.selectedIds.set(new Set([request.file.id]));
    }

    this.openFileMenu({
      x: request.event.clientX,
      y: request.event.clientY,
    });
  }

  onDirectoryContextMenu(request: SharedFilesDirectoryMenuRequest) {
    request.event.preventDefault();
    request.event.stopPropagation();
    if (request.event.pointerType !== 'mouse') return;
    this.selection.clear();
    this.openDirectoryMenu({
      x: request.event.clientX,
      y: request.event.clientY,
    });
  }

  onOperation(operation: SharedFilesOperation) {
    switch (operation.type) {
      case 'open-folder':
        this.fileService.goToFolder(operation.file.id);
        break;
      case 'open-location':
        this.openLocation(operation.file);
        break;
      case 'rename':
        this.renameSharedFile(operation.file);
        break;
      case 'rename-inline':
        this.fileService.renameFileWithFeedback(operation.file, operation.name);
        break;
      case 'delete':
      case 'cancel-upload':
        this.cancelOrDelete(
          operation.files,
          operation.type === 'cancel-upload',
        );
        break;
      case 'move':
        this.fileService.markFilesToMoveWithFeedback(operation.files);
        break;
      case 'copy':
        this.fileService.markFilesToCopyWithFeedback(operation.files);
        break;
      case 'download':
        this.downloadService.downloadFilesWithFeedback(operation.files);
        break;
      case 'pause-upload':
        operation.files
          .filter((file) => file.progressStatus === ProgressStatus.Started)
          .forEach((file) => this.uploadService.pause(file.id));
        break;
      case 'resume-upload':
        operation.files
          .filter((file) => file.progressStatus === ProgressStatus.Stopped)
          .forEach((file) =>
            this.uploadService.resume(file, this.fileService.parentId()),
          );
        break;
      case 'sort':
        this.toggleSort(operation.column);
        break;
    }
  }

  onTableMenuAction(
    action: 'refresh' | 'create' | 'paste' | 'upload',
    files?: File[],
  ) {
    if (action === 'refresh') {
      this.fileService.reloadCurrentList();
      this.storageService.refresh();
    } else if (action === 'create') {
      this.createFolder();
    } else if (action === 'paste') {
      this.pasteFiles();
    } else if (action === 'upload' && files) {
      this.uploadFiles(files);
    }
  }

  toggleSort(column: string) {
    this.fileService.toggleSort(column, descendingFirstSortColumns.has(column));
  }

  private openFileMenu(position: { x: number; y: number }) {
    this.directoryContextMenu()?.close();
    this.contextMenuPosition.set(position);
    this.fileContextMenu()?.open();
  }

  private openDirectoryMenu(position: { x: number; y: number }) {
    this.fileContextMenu()?.close();
    this.contextMenuPosition.set(position);
    this.directoryContextMenu()?.open();
  }

  private async openLocation(file: SharedFile) {
    this.fileService.goToFolder(file.parentId);
    await this.fileService.waitForNextCurrentReload();
    this.selection.scrollToId(file.id);
  }

  private async renameFile(file: SharedFile) {
    const newFileName = await this.modalService.getNewFileName({
      startName: file.fileName,
      blacklistedNames: new Set(
        [...this.fileService.names()].filter((name) => name !== file.fileName),
      ),
    });
    if (newFileName && newFileName !== file.fileName) {
      this.fileService.renameFileWithFeedback(file, newFileName);
    }
  }

  private renameSharedFile(file: SharedFile) {
    if (
      this.viewMode() === 'list' &&
      window.matchMedia('(min-width: 576px)').matches
    ) {
      this.fileService.editingId.set(file.id);
      return;
    }

    this.renameFile(file);
  }

  private pasteFiles() {
    this.fileService.pasteFilesWithFeedback((ids) => {
      this.selection.selectedIds.set(ids);
      if (ids.size > 0) this.selection.scrollToId(Array.from(ids).pop()!);
    });
  }

  private uploadFiles(files: File[]) {
    const filesWithPath = files.map((file) => ({ file, path: '' }));
    this.uploadService
      .uploadFiles([], filesWithPath, this.fileService.parentId())
      .subscribe();
  }

  private async createFolder() {
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

  private async cancelOrDelete(files: SharedFile[], cancelUpload: boolean) {
    if (cancelUpload) {
      const incompleteFiles = files.filter(
        (file) => file.fileStatus === FileStatus.Incomplete,
      );
      if (await this.fileService.deleteFilesWithFeedback(incompleteFiles)) {
        incompleteFiles.forEach((file) => this.uploadService.cancel(file.id));
      }
      return;
    }
    this.fileService.deleteFilesWithFeedback(files);
  }
}
