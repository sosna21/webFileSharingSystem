import { Component, input, output, computed, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import {
  NgbTooltipModule,
  NgbProgressbarModule,
} from '@ng-bootstrap/ng-bootstrap';
import { FileToIconPipe } from '../../../core/pipes/file-to-icon.pipe';
import { BaseFile, FileStatus } from '../../../core/models/base-file.model';
import { SelectFilenameDirective } from '../../../core/directives/select-filename.directive';
import { BaseCellDirective } from '../base-cell.directive';
import { AuthenticationService } from '../../../core/services/authentication.service';
import { TooltipOnOverflowDirective } from '../../../core/directives/tooltip-on-overflow.directive';
import { UploadStatusComponent } from './upload-status/upload-status.component';
import { UploadProgressbarComponent } from './upload-progressbar/upload-progressbar.component';
import { UploadControlBtnsComponent } from './upload-control-btns/upload-control-btns.component';

@Component({
  selector: 'app-file-name-cell',
  imports: [
    CommonModule,
    FormsModule,
    NgbTooltipModule,
    NgbProgressbarModule,
    FileToIconPipe,
    SelectFilenameDirective,
    TooltipOnOverflowDirective,
    UploadStatusComponent,
    UploadProgressbarComponent,
    UploadControlBtnsComponent,
  ],
  templateUrl: './file-name-cell.component.html',
  styleUrl: './file-name-cell.component.scss',
})
export class FileNameCellComponent<
  T extends BaseFile,
> extends BaseCellDirective<T> {
  private readonly authService = inject(AuthenticationService);
  readonly editingId = input<number | null>(null);

  readonly rename = output<{ file: T; newName: string }>();
  readonly fileRenameKeyDown = output<{ event: KeyboardEvent; file: T }>();
  readonly stopFilesUpload = output<T[]>();
  readonly continueFilesUpload = output<T[]>();

  readonly FileStatus = FileStatus;
  readonly isUserCreatedFile = computed(
    () => this.file().createdBy == this.authService.currentUser()?.id,
  );

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
