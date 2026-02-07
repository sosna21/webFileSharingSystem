import { Component, computed, inject, signal } from '@angular/core';
import { SelectFilenameDirective } from '../../../../core/directives/select-filename.directive';
import { ActionType } from '../../../../core/models/action-type.model';
import { MessageSeverity } from '../../../../core/models/toast-info.model';
import { FileService } from '../../../../core/services/file.service';
import { FormsModule } from '@angular/forms';
import { NgbTooltipModule } from '@ng-bootstrap/ng-bootstrap';
import { DownloadService } from '../../../../core/services/download.service';
import { FileShareService } from '../../../../core/services/file-share.service';
import { ToastService } from '../../../../core/services/toast.service';
import { SelectionService } from '../../../../core/services/selection.service';
import { BaseFile, FileStatus } from '../../../../core/models/base-file.model';
import { FileApiService } from '../../../../core/services/api/file-api.service';
import { ShareAccessMode } from '../../../../core/models/share-access-mode.model';

@Component({
  selector: 'app-file-actions-strip',
  imports: [SelectFilenameDirective, FormsModule, NgbTooltipModule],
  templateUrl: './file-actions-strip.component.html',
  styleUrl: './file-actions-strip.component.scss',
  host: {
    class: 'd-flex gap-3 align-items-end',
  },
})
export class FileActionsStripComponent {
  private readonly fileService = inject(FileService);
  private readonly fileApiService = inject(FileApiService);
  private readonly selectionService = inject(SelectionService<BaseFile>);

  private readonly shareService = inject(FileShareService);
  private readonly toast = inject(ToastService);
  private readonly downloadService = inject(DownloadService);
  private readonly names = computed(() =>
    this.fileService.userFiles().map((file) => file.fileName),
  );
  readonly showDirCreate = signal(false);
  readonly newFolderName = signal('');
  readonly files = this.fileService.userFiles;
  readonly activeAction = this.fileService.awaitingActionState;
  readonly selectedFiles = this.selectionService.selectedItems;
  readonly hasSelectedFiles = computed(() => this.selectedFiles().length > 0);
  readonly canPaste = computed(() => this.activeAction() !== null);
  readonly canCopy = computed(
    () =>
      this.selectedFiles().length > 0 &&
      this.selectedFiles().some(
        (file) => file.fileStatus === FileStatus.Completed,
      ),
  );
  readonly viewingSharedFiles = computed(
    () => this.fileService.mode() === 'GetSharedWithMe',
  );

  readonly canFileAction = computed(
    () =>
      this.selectedFiles().length > 0 &&
      this.selectedFiles().some(
        (file) => file.fileStatus === FileStatus.Completed,
      ) &&
      (this.selectedFiles() as BaseFile[]).every(
        (file) =>
          file.accessMode === undefined ||
          file.accessMode >= ShareAccessMode.ReadWrite,
      ),
  );

  readonly canRename = computed(
    () =>
      this.selectedFiles().length === 1 &&
      this.selectedFiles()[0].fileStatus === FileStatus.Completed &&
      (this.selectedFiles()[0].accessMode === undefined ||
        this.selectedFiles()[0].accessMode >= ShareAccessMode.ReadWrite),
  );

  readonly canDelete = computed(
    () =>
      this.selectedFiles().length > 0 &&
      this.selectedFiles().some(
        (file) => file.fileStatus === FileStatus.Completed,
      ) &&
      (this.selectedFiles() as BaseFile[]).every(
        (file) =>
          file.accessMode === undefined ||
          file.accessMode >= ShareAccessMode.FullAccess,
      ),
  );

  findUniqueDirName(): string {
    let dirName = 'New folder';
    let counter = 0;
    while (this.names().includes(dirName)) {
      dirName = `New folder (${++counter})`;
    }
    return dirName;
  }

  resetNewFolderName() {
    this.newFolderName.set(this.findUniqueDirName());
  }

  createDirectory() {
    this.fileApiService
      .createDirectory(this.newFolderName(), this.fileService.parentId())
      .subscribe({
        next: (response) => {
          this.fileService.userFiles.update((files) => [response, ...files]);
          this.newFolderName.set(this.findUniqueDirName());
          this.toast.show(
            'New directory created',
            `Directory "${response.fileName}" has been created`,
            MessageSeverity.success,
          );
        },
        error: (error) => {
          this.toast.show(
            'Error creating directory',
            error?.error,
            MessageSeverity.error,
          );
        },
      });

    this.cancelRename();
  }

  cancelRename() {
    this.resetNewFolderName();
    this.showDirCreate.set(false);
  }

  initDirCreation() {
    if (!this.showDirCreate()) this.showDirCreate.set(true);
    this.newFolderName.set(this.findUniqueDirName());
  }

  onDownload() {
    this.downloadService.downloadFilesWithFeedback(
      this.selectedFiles().filter(
        (file) => file.fileStatus === FileStatus.Completed,
      ),
    );
  }

  onCut() {
    if (!this.canFileAction()) return;
    this.fileService.markFilesToMoveWithFeedback(
      this.selectedFiles().filter(
        (file) => file.fileStatus === FileStatus.Completed,
      ),
    );
  }

  onCopy() {
    if (!this.canCopy()) return;
    this.fileService.markFilesToCopyWithFeedback(
      this.selectedFiles().filter(
        (file) => file.fileStatus === FileStatus.Completed,
      ),
    );
  }

  onPaste() {
    if (!this.canPaste()) return;
    const action = this.activeAction();
    if (!action) return;
    if (action.type === ActionType.Move) {
      this.fileService.moveFilesWithFeedback(
        Array.from(action.files),
        this.fileService.parentId(),
        this.fileService.parentName() ?? 'home directory',
      );
    } else if (action.type === ActionType.Copy) {
      this.fileService.copyFilesWithFeedback(
        Array.from(action.files),
        this.fileService.parentId(),
        this.fileService.parentName() ?? 'home directory',
      );
    }

    this.fileService.clearActionContext();
  }

  onRename() {
    if (!this.canRename()) return;
    this.fileService.editingId.set(this.selectedFiles()[0].id);
  }

  onShare() {
    if (!this.canFileAction() || this.viewingSharedFiles()) return;
    this.shareService.shareFilesWithFeedback(
      this.selectedFiles().filter(
        (file) => file.fileStatus === FileStatus.Completed,
      ),
    );
  }

  onDelete() {
    if (!this.canFileAction()) return;
    this.fileService.deleteFilesWithFeedback(
      this.selectedFiles().filter(
        (file) => file.fileStatus === FileStatus.Completed,
      ),
    );
  }
}
