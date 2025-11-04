import { NgStyle, NgTemplateOutlet } from '@angular/common';
import { Component, computed, input, output, viewChild } from '@angular/core';
import { NgbDropdown, NgbDropdownModule } from '@ng-bootstrap/ng-bootstrap';
import { AppFile, FileStatus, ProgressStatus } from '../../../../core/models/app-file.model';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-base-table-context-menu',
  imports: [NgbDropdownModule, NgStyle, FormsModule, NgTemplateOutlet],
  templateUrl: './base-table-context-menu.component.html',
  styleUrl: './base-table-context-menu.component.scss'
})
export class BaseTableContextMenuComponent {
  readonly dropdown = viewChild(NgbDropdown);
  readonly position = input.required<{ x: number, y: number }>();
  readonly selectedFiles = input.required<AppFile[]>();

  readonly ProgressStatus = ProgressStatus;
  readonly areSelectedFilesUploading = computed(() => this.selectedFiles().every(file => file.progressStatus === ProgressStatus.Started));
  readonly areAllFilesIncomplete = computed(() => this.selectedFiles().every(file => file.fileStatus === FileStatus.Incomplete));
  readonly allFilesHaveSameUploadStatus = computed(() => this.selectedFiles().length > 0 &&
    this.selectedFiles().filter(file => file.fileStatus === FileStatus.Incomplete).every(file => file.progressStatus === this.selectedFiles()[0].progressStatus));
  readonly areAllFilesComplete = computed(() => this.selectedFiles().every(file => file.fileStatus === FileStatus.Completed));
  readonly anySelectedFileIsUnFavourite = computed(() => this.selectedFiles().filter(file => file.fileStatus === FileStatus.Completed).some(file => !file.isFavourite));
  readonly mixedFileComplition = computed(() => !this.areAllFilesIncomplete() && !this.areAllFilesComplete());

  readonly rename = output<AppFile>();
  readonly toggleFavourite = output<boolean>();
  readonly selectFolder = output<number>();
  readonly download = output();
  readonly delete = output<AppFile[]>();
  readonly cancelUpload = output<AppFile[]>();
  readonly resumeUpload = output<AppFile[]>();
  readonly pauseUpload = output<AppFile[]>();
  readonly copy = output<AppFile[]>();
  readonly move = output<AppFile[]>();
  readonly share = output<AppFile[]>();
  readonly generateLink = output();

  open() {
    this.dropdown()?.open();
  }

  close() {
    if (this.dropdown()?.isOpen()) {
      this.dropdown()?.close();
    }
  }

  pauseUploadClicked() {
    const uploadingFiles = this.selectedFiles().filter(file => file.fileStatus === FileStatus.Incomplete && file.progressStatus === ProgressStatus.Started);
    this.pauseUpload.emit(uploadingFiles);
  }

  resumeUploadClicked() {
    const pausedFiles = this.selectedFiles().filter(file => file.fileStatus === FileStatus.Incomplete && file.progressStatus !== ProgressStatus.Started);
    this.resumeUpload.emit(pausedFiles);
  }

  cancelUploadClicked() {
    const incompleteFiles = this.selectedFiles().filter(file => file.fileStatus === FileStatus.Incomplete);
    this.cancelUpload.emit(incompleteFiles);
  }

  moveClicked() {
    const completedFiles = this.selectedFiles().filter(file => file.fileStatus === FileStatus.Completed);
    this.move.emit(completedFiles);
  }

  copyClicked() {
    const completedFiles = this.selectedFiles().filter(file => file.fileStatus === FileStatus.Completed);
    this.copy.emit(completedFiles);
  }

  shareClicked() {
    const completedFiles = this.selectedFiles().filter(file => file.fileStatus === FileStatus.Completed);
    this.share.emit(completedFiles);
  }

  deleteClicked() {
    const completedFiles = this.selectedFiles().filter(file => file.fileStatus === FileStatus.Completed);
    this.delete.emit(completedFiles);
  }
}
