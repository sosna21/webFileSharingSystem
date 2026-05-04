import { Component, computed, inject, signal } from '@angular/core';
import { SelectFilenameDirective } from '../../../../core/directives/select-filename.directive';
import { FileService } from '../../../../core/services/file.service';
import { FormsModule } from '@angular/forms';
import { NgbTooltipModule } from '@ng-bootstrap/ng-bootstrap';
import { DownloadService } from '../../../../core/services/download.service';
import { FileShareService } from '../../../../core/services/file-share.service';
import { SelectionService } from '../../../../core/services/selection.service';
import { BaseFile, FileStatus } from '../../../../core/models/base-file.model';
import { ShareAccessMode } from '../../../../core/models/share-access-mode.model';
import { generateUniqueDirName } from '../../../../core/utils/file-utils';

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
  private readonly selectionService = inject(SelectionService<BaseFile>);

  private readonly shareService = inject(FileShareService);
  private readonly downloadService = inject(DownloadService);
  private readonly names = this.fileService.names;
  readonly showDirCreateNameInput = signal(false);
  readonly newFolderName = signal('');
  readonly isNameForbidden = computed(() =>
    this.names().has(this.newFolderName()),
  );

  readonly activeAction = this.fileService.awaitingActionState;
  readonly selectedFiles = this.selectionService.selectedItems;
  readonly hasSelectedFiles = computed(() => this.selectedFiles().length > 0);
  readonly canCreateDirectory = computed(
    () =>
      this.fileService.parentBreadcrumb() &&
      (this.fileService.parentBreadcrumb()!.accessMode === undefined ||
        this.fileService.parentBreadcrumb()!.accessMode! >=
          ShareAccessMode.ReadWrite),
  );
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

  resetNewFolderName() {
    this.newFolderName.set(generateUniqueDirName(this.names()));
  }

  createDirectory() {
    if (this.isNameForbidden()) return;
    this.fileService.createDirectoryWithFeedback(this.newFolderName(), (id) => {
      this.selectionService.selectedIds.set(new Set([id]));
      this.selectionService.scrollToId(id);
    });

    this.newFolderName.set(generateUniqueDirName(this.names()));
    this.cancelRename();
  }

  cancelRename() {
    this.resetNewFolderName();
    this.showDirCreateNameInput.set(false);
  }

  initDirCreation() {
    if (!this.showDirCreateNameInput()) this.showDirCreateNameInput.set(true);
    this.newFolderName.set(generateUniqueDirName(this.names()));
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
    this.fileService.pasteFilesWithFeedback();
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
