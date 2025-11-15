import { Component, computed, inject, signal } from '@angular/core';
import { SelectFilenameDirective } from '../../../../core/directives/select-filename.directive';
import { ActionType } from '../../../../core/models/action-type.model';
import { FileStatus } from '../../../../core/models/app-file.model';
import { MessageSeverity } from '../../../../core/models/toast-info.model';
import { FileService } from '../../../../core/services/file.service';
import { FormsModule } from '@angular/forms';
import { NgbTooltipModule } from '@ng-bootstrap/ng-bootstrap';
import { DownloadService } from '../../../../core/services/download.service';
import { FileShareService } from '../../../../core/services/file-share.service';
import { ToastService } from '../../../../core/services/toast.service';

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

  private readonly shareService = inject(FileShareService);
  private readonly toast = inject(ToastService);
  private readonly downloadService = inject(DownloadService);
  private readonly names = computed(() =>
    this.fileService.files().map((file) => file.fileName)
  );
  readonly showDirCreate = signal(false);
  readonly newFolderName = signal('');
  readonly files = this.fileService.files;
  readonly activeAction = this.fileService.waitingForAction;
  readonly selectedFiles = computed(() =>
    this.files().filter((file) => file.checked)
  );
  readonly hasSelectedFiles = computed(() => this.selectedFiles().length > 0);
  readonly canPaste = computed(() => this.activeAction() !== null);
  readonly canFileAction = computed(
    () =>
      this.selectedFiles().length > 0 &&
      this.selectedFiles().some(
        (file) => file.fileStatus === FileStatus.Completed
      )
  );
  readonly canRename = computed(
    () =>
      this.selectedFiles().length === 1 &&
      this.selectedFiles()[0].fileStatus === FileStatus.Completed
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
    this.fileService.createDirectory(this.newFolderName()).subscribe({
      next: (response) => {
        this.fileService.files.update((files) => [response, ...files]);
        this.newFolderName.set(this.findUniqueDirName());
        this.toast.show(
          'New directory created',
          `Directory "${response.fileName}" has been created`,
          MessageSeverity.success
        );
      },
      error: (error) => {
        this.toast.show(
          'Error creating directory',
          error?.error,
          MessageSeverity.error
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
        (file) => file.fileStatus === FileStatus.Completed
      )
    );
  }

  onCut() {
    if (!this.canFileAction()) return;
    this.fileService.setFilesMarkedForAction(
      this.selectedFiles().filter(
        (file) => file.fileStatus === FileStatus.Completed
      ),
      ActionType.Move
    );
  }

  onCopy() {
    if (!this.canFileAction()) return;
    this.fileService.setFilesMarkedForAction(
      this.selectedFiles().filter(
        (file) => file.fileStatus === FileStatus.Completed
      ),
      ActionType.Copy
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
        this.fileService.parentName() ?? 'home directory'
      );
    } else if (action.type === ActionType.Copy) {
      this.fileService.copyFilesWithFeedback(
        Array.from(action.files),
        this.fileService.parentId(),
        this.fileService.parentName() ?? 'home directory'
      );
    }

    this.fileService.clearActionContext();
  }

  onRename() {
    if (!this.canRename()) return;
    this.fileService.updateFile(this.selectedFiles()[0], { rename: true });
  }

  onShare() {
    if (!this.canFileAction()) return;
    this.shareService.shareFilesWithFeedback(
      this.selectedFiles().filter(
        (file) => file.fileStatus === FileStatus.Completed
      )
    );
  }

  onDelete() {
    if (!this.canFileAction()) return;
    this.fileService.deleteFilesWithFeedback(
      this.selectedFiles().filter(
        (file) => file.fileStatus === FileStatus.Completed
      )
    );
  }
}
