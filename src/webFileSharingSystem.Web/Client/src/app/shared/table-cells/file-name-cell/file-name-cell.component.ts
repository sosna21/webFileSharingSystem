import { Component, ChangeDetectionStrategy, input, output } from '@angular/core';
import { CommonModule, DecimalPipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { NgbTooltipModule, NgbProgressbarModule } from '@ng-bootstrap/ng-bootstrap';
import { FileToIconPipe } from '../../../core/pipes/file-to-icon.pipe';
import { FileSizePipe } from '../../../core/pipes/file-size.pipe';
import { BaseFile, FileStatus, ProgressStatus } from '../../../core/models/base-file.model';
import { ClicableIconDirective } from '../../../core/directives/clicable-icon.directive';
import { SelectFilenameDirective } from '../../../core/directives/select-filename.directive';

@Component({
  selector: 'app-file-name-cell',
  imports: [
    CommonModule,
    DecimalPipe,
    FormsModule,
    NgbTooltipModule,
    NgbProgressbarModule,
    FileToIconPipe,
    FileSizePipe,
    ClicableIconDirective,
    SelectFilenameDirective
  ],
  templateUrl: './file-name-cell.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class FileNameCellComponent<T extends BaseFile = BaseFile> {
  file = input.required<T>();
  editingId = input<number | null>(null);

  contextMenuClick = output<{ event: MouseEvent, file: T }>();
  rename = output<{ file: T, newName: string }>();
  fileRenameKeyDown = output<{ event: KeyboardEvent, file: T }>();
  stopFilesUpload = output<T[]>();
  continueFilesUpload = output<T[]>();

  FileStatus = FileStatus;
  ProgressStatus = ProgressStatus;

  getFileSize(sizeStr: string): number {
    return +(sizeStr.split(' ')[0] ?? 0);
  }

  onContextMenuClick(event: MouseEvent, file: T): void {
    this.contextMenuClick.emit({ event, file });
  }

  onRename(file: T, newName: string): void {
    this.rename.emit({ file, newName });
  }

  onFileRenameKeyDown(event: KeyboardEvent, file: T): void {
    this.fileRenameKeyDown.emit({ event, file });
  }

  onStopFilesUpload(files: T[]): void {
    this.stopFilesUpload.emit(files);
  }

  onContinueFilesUpload(files: T[]): void {
    this.continueFilesUpload.emit(files);
  }
}
