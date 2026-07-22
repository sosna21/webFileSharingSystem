import { NgStyle, NgTemplateOutlet } from '@angular/common';
import {
  Component,
  computed,
  inject,
  input,
  output,
  viewChild,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { NgbDropdown, NgbDropdownModule } from '@ng-bootstrap/ng-bootstrap';
import { SharedFile } from '../../../core/models/shared-file.model';
import { ShareAccessMode } from '../../../core/models/share-access-mode.model';
import {
  FileStatus,
  ProgressStatus,
} from '../../../core/models/base-file.model';
import { FileService } from '../../../core/services/file.service';

@Component({
  selector: 'app-shared-files-context-menu',
  imports: [NgbDropdownModule, NgStyle, FormsModule, NgTemplateOutlet],
  templateUrl: './shared-files-context-menu.component.html',
  styleUrl: './shared-files-context-menu.component.scss',
})
export class SharedFilesContextMenuComponent {
  private readonly fileService = inject(FileService);

  readonly dropdown = viewChild(NgbDropdown);

  readonly position = input.required<{ x: number; y: number }>();
  readonly selectedFiles = input.required<SharedFile[]>();

  readonly ShareAccessMode = ShareAccessMode;
  readonly ProgressStatus = ProgressStatus;

  readonly inSearchView = computed(
    () => !!this.fileService.searchedPhrase()?.trim(),
  );

  readonly areAllFilesIncomplete = computed(() =>
    this.selectedFiles().every(
      (file) => file.fileStatus === FileStatus.Incomplete,
    ),
  );

  readonly areAllFilesComplete = computed(() =>
    this.selectedFiles().every(
      (file) => file.fileStatus === FileStatus.Completed,
    ),
  );

  readonly mixedFileComplition = computed(
    () => !this.areAllFilesIncomplete() && !this.areAllFilesComplete(),
  );

  readonly allFilesHaveSameUploadStatus = computed(
    () =>
      this.selectedFiles().length > 0 &&
      this.selectedFiles()
        .filter((file) => file.fileStatus === FileStatus.Incomplete)
        .every(
          (file) =>
            file.progressStatus === this.selectedFiles()[0].progressStatus,
        ),
  );

  readonly showOpenFolder = computed(
    () =>
      this.selectedFiles().length === 1 &&
      this.selectedFiles()[0].fileStatus === FileStatus.Completed &&
      this.selectedFiles()[0].isDirectory,
  );

  readonly canRename = computed(
    () =>
      this.selectedFiles().length === 1 &&
      this.selectedFiles()[0].fileStatus === FileStatus.Completed &&
      this.selectedFiles()[0].accessMode! >= ShareAccessMode.ReadWrite,
  );

  readonly canCut = computed(() => {
    const completedFiles = this.selectedFiles().filter(
      (file) => file.fileStatus === FileStatus.Completed,
    );

    return (
      completedFiles.length > 0 &&
      completedFiles.every(
        (file) => file.accessMode! >= ShareAccessMode.ReadWrite,
      )
    );
  });

  readonly canDelete = computed(() => {
    const completedFiles = this.selectedFiles().filter(
      (file) => file.fileStatus === FileStatus.Completed,
    );

    return (
      completedFiles.length > 0 &&
      completedFiles.every(
        (file) => file.accessMode === ShareAccessMode.FullAccess,
      )
    );
  });

  readonly rename = output<SharedFile>();
  readonly download = output<SharedFile[]>();
  readonly delete = output<SharedFile[]>();
  readonly copy = output<SharedFile[]>();
  readonly move = output<SharedFile[]>();

  readonly cancelUpload = output<SharedFile[]>();
  readonly resumeUpload = output<SharedFile[]>();
  readonly pauseUpload = output<SharedFile[]>();

  readonly openFolder = output<SharedFile>();
  readonly openLocation = output<SharedFile>();

  open() {
    this.dropdown()?.open();
  }

  close() {
    if (this.dropdown()?.isOpen()) {
      this.dropdown()?.close();
    }
  }

  pauseUploadClicked() {
    const uploadingFiles = this.selectedFiles().filter(
      (file) =>
        file.fileStatus === FileStatus.Incomplete &&
        file.progressStatus === ProgressStatus.Started,
    );

    this.pauseUpload.emit(uploadingFiles);
  }

  resumeUploadClicked() {
    const pausedFiles = this.selectedFiles().filter(
      (file) =>
        file.fileStatus === FileStatus.Incomplete &&
        file.progressStatus !== ProgressStatus.Started,
    );

    this.resumeUpload.emit(pausedFiles);
  }

  cancelUploadClicked() {
    const incompleteFiles = this.selectedFiles().filter(
      (file) => file.fileStatus === FileStatus.Incomplete,
    );

    this.cancelUpload.emit(incompleteFiles);
  }

  copyClicked() {
    const completedFiles = this.selectedFiles().filter(
      (file) => file.fileStatus === FileStatus.Completed,
    );

    this.copy.emit(completedFiles);
  }

  moveClicked() {
    const completedFiles = this.selectedFiles().filter(
      (file) => file.fileStatus === FileStatus.Completed,
    );

    this.move.emit(completedFiles);
  }

  deleteClicked() {
    const completedFiles = this.selectedFiles().filter(
      (file) => file.fileStatus === FileStatus.Completed,
    );

    this.delete.emit(completedFiles);
  }

  downloadClicked() {
    const completedFiles = this.selectedFiles().filter(
      (file) => file.fileStatus === FileStatus.Completed,
    );

    this.download.emit(completedFiles);
  }
}
