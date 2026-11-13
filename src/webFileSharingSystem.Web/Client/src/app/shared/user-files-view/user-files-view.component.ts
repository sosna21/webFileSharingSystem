import { CommonModule } from '@angular/common';
import {
  Component,
  computed,
  inject,
  Injector,
  signal,
  viewChild,
} from '@angular/core';
import { AppFile } from '../../core/models/app-file.model';
import { FileStatus, ProgressStatus } from '../../core/models/base-file.model';
import { StorageService } from '../../core/services/storage.service';
import { DragDropService } from '../../core/services/drag-drop.service';
import { DownloadService } from '../../core/services/download.service';
import { FileOperationsService } from '../../core/services/file-operations.service';
import { FileViewService } from '../../core/services/file-view.service';
import { FileShareService } from '../../core/services/file-share.service';
import { FileUploadService } from '../../core/services/file-upload.service';
import { ModalService } from '../../core/services/modal.service';
import { SelectionService } from '../../core/services/selection.service';
import { StateService } from '../../core/services/state.service';
import { generateUniqueDirName } from '../../core/utils/file-utils';
import { UserFilesContextMenuComponent } from '../user-files-table/user-files-context-menu/user-files-context-menu.component';
import { TableContextMenuComponent } from '../table-context-menu/table-context-menu.component';
import { UserFilesGridComponent } from '../user-files-grid/user-files-grid.component';
import { UserFilesTableComponent } from '../user-files-table/user-files-table.component';
import { UploadOverlayComponent } from '../upload-overlay/upload-overlay.component';
import {
  UserFilesContextMenuRequest,
  UserFilesDirectoryMenuRequest,
  UserFilesOperation,
} from './user-files-view.types';

const descendingFirstSortColumns = new Set(['favourite', 'share', 'size']);

@Component({
  selector: 'app-user-files-view',
  imports: [
    CommonModule,
    UserFilesTableComponent,
    UserFilesGridComponent,
    UserFilesContextMenuComponent,
    TableContextMenuComponent,
    UploadOverlayComponent,
  ],
  templateUrl: './user-files-view.component.html',
  host: {
    class: 'd-block h-100',
  },
})
export class UserFilesViewComponent {
  readonly storageService = inject(StorageService);
  readonly fileView = inject(FileViewService);
  readonly fileOperations = inject(FileOperationsService);
  readonly viewMode = inject(StateService).viewMode;
  readonly files = this.fileView.userFiles;
  readonly selectedFiles = inject(SelectionService<AppFile>).selectedItems;
  readonly dragTarget = inject(DragDropService<AppFile>).dragTarget;
  readonly isInternalHover = inject(DragDropService<AppFile>).isInternalHover;
  readonly contextMenuPosition = signal({ x: 0, y: 0 });
  readonly currentDirectoryAccessMode = computed(
    () => this.fileView.parentBreadcrumb()?.accessMode,
  );
  readonly canPaste = computed(() => !!this.fileOperations.awaitingActionState());
  readonly sortOption = this.fileView.sortOption;
  readonly sortableColumns = computed(() => [
    { column: 'fileName', displayName: $localize`File name` },
    { column: 'favourite', displayName: $localize`Favourite` },
    { column: 'share', displayName: $localize`Share` },
    { column: 'size', displayName: $localize`Size` },
    { column: 'createdByUserName', displayName: $localize`Created By` },
    { column: 'lastModification', displayName: $localize`Last Modification` },
  ]);

  readonly fileContextMenu = viewChild(UserFilesContextMenuComponent);
  readonly directoryContextMenu = viewChild(TableContextMenuComponent);

  private readonly uploadService = inject(FileUploadService);
  private readonly downloadService = inject(DownloadService);
  private readonly shareService = inject(FileShareService);
  private readonly modalService = inject(ModalService);
  private readonly injector = inject(Injector);
  private readonly selection = inject(SelectionService<AppFile>);

  openTableContextMenu() {
    this.openDirectoryMenu({ x: 0, y: 0 });
  }

  openFileContextMenu() {
    this.openFileMenu({ x: 0, y: 0 });
  }

  onFileContextMenu(request: UserFilesContextMenuRequest) {
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

  onDirectoryContextMenu(request: UserFilesDirectoryMenuRequest) {
    request.event.preventDefault();
    request.event.stopPropagation();
    if (request.event.pointerType !== 'mouse') return;
    this.selection.clear();
    this.openDirectoryMenu({
      x: request.event.clientX,
      y: request.event.clientY,
    });
  }

  onOperation(operation: UserFilesOperation) {
    switch (operation.type) {
      case 'open-folder':
        this.fileView.goToFolder(operation.file.id);
        break;
      case 'open-location':
        this.openLocation(operation.file);
        break;
      case 'rename':
        this.renameUserFile(operation.file);
        break;
      case 'rename-inline':
        this.fileOperations.renameFileWithFeedback(operation.file, operation.name);
        break;
      case 'toggle-favourite':
        this.fileOperations.changeFilesFavouriteWithFeedback(
          operation.files,
          operation.value,
        );
        break;
      case 'delete':
      case 'cancel-upload':
        this.cancelOrDelete(
          operation.files,
          operation.type === 'cancel-upload',
        );
        break;
      case 'share':
        this.shareService.shareFilesWithFeedback(operation.files);
        break;
      case 'manage-shares':
        this.modalService.manageSharesModal(
          {
            sharedFile: operation.file,
            title: $localize`Manage shares for: '${operation.file.fileName}'`,
          },
          this.injector,
        );
        break;
      case 'move':
        this.fileOperations.markFilesToMoveWithFeedback(operation.files);
        break;
      case 'copy':
        this.fileOperations.markFilesToCopyWithFeedback(operation.files);
        break;
      case 'download':
        this.downloadService.downloadFilesWithFeedback(operation.files);
        break;
      case 'generate-link':
        this.shareService.generateShareLinkWithFeedback(
          operation.files.map((file) => file.id),
        );
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
            this.uploadService.resume(file, this.fileView.parentId()),
          );
        break;
      case 'sort':
        this.toggleSort(operation.column);
        break;
    }
  }

  private renameUserFile(file: AppFile) {
    if (
      this.viewMode() === 'list' &&
      window.matchMedia('(min-width: 576px)').matches
    ) {
      this.fileOperations.editingId.set(file.id);
      return;
    }

    this.renameFile(file);
  }

  onTableMenuAction(
    action: 'refresh' | 'create' | 'paste' | 'upload',
    files?: File[],
  ) {
    if (action === 'refresh') {
      this.fileView.reloadCurrentList();
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
    this.fileView.toggleSort(column, descendingFirstSortColumns.has(column));
  }

  private openFileMenu(position: { x: number; y: number }) {
    this.directoryContextMenu()?.close();
    this.contextMenuPosition.set(position);
    this.fileContextMenu()?.open();
  }

  closeContextMenus() {
    this.fileContextMenu()?.close();
    this.directoryContextMenu()?.close();
  }

  private openDirectoryMenu(position: { x: number; y: number }) {
    this.fileContextMenu()?.close();
    this.contextMenuPosition.set(position);
    this.directoryContextMenu()?.open();
  }

  private async openLocation(file: AppFile) {
    this.fileView.goToFolder(file.parentId);
    await this.fileView.waitForNextCurrentReload();
    this.selection.scrollToId(file.id);
  }

  private async renameFile(file: AppFile) {
    const newFileName = await this.modalService.getNewFileName({
      startName: file.fileName,
      blacklistedNames: new Set(
        [...this.fileView.names()].filter((name) => name !== file.fileName),
      ),
    });
    if (newFileName && newFileName !== file.fileName) {
      this.fileOperations.renameFileWithFeedback(file, newFileName);
    }
  }

  private uploadFiles(files: File[]) {
    this.uploadService
      .uploadFiles(
        [],
        files.map((file) => ({ file, path: '' })),
        this.fileView.parentId(),
      )
      .subscribe();
  }

  private pasteFiles() {
    this.fileOperations.pasteFilesWithFeedback((ids) => {
      this.selection.selectedIds.set(ids);
      if (ids.size > 0) this.selection.scrollToId(Array.from(ids).pop()!);
    });
  }

  private async createFolder() {
    const newDirName = await this.modalService.getNewDirectoryName({
      startName: generateUniqueDirName(this.fileView.names()),
      blacklistedNames: this.fileView.names(),
    });
    if (!newDirName) return;
    this.fileOperations.createDirectoryWithFeedback(newDirName, (id) => {
      this.selection.selectedIds.set(new Set([id]));
      this.selection.scrollToId(id);
    });
  }

  private async cancelOrDelete(files: AppFile[], cancelUpload: boolean) {
    const incompleteFiles = files.filter(
      (file) => file.fileStatus === FileStatus.Incomplete,
    );
    if (
      !cancelUpload ||
      (await this.fileOperations.deleteFilesWithFeedback(incompleteFiles))
    ) {
      if (cancelUpload)
        incompleteFiles.forEach((file) => this.uploadService.cancel(file.id));
      else this.fileOperations.deleteFilesWithFeedback(files);
    }
  }
}
