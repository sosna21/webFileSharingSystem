import {
  Component,
  ChangeDetectionStrategy,
  input,
  output,
  computed,
  inject,
} from '@angular/core';
import { CommonModule, DecimalPipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import {
  NgbTooltipModule,
  NgbProgressbarModule,
} from '@ng-bootstrap/ng-bootstrap';
import { FileToIconPipe } from '../../../core/pipes/file-to-icon.pipe';
import { FileSizePipe } from '../../../core/pipes/file-size.pipe';
import {
  BaseFile,
  FileStatus,
  ProgressStatus,
} from '../../../core/models/base-file.model';
import { ClicableIconDirective } from '../../../core/directives/clicable-icon.directive';
import { SelectFilenameDirective } from '../../../core/directives/select-filename.directive';
import { BaseCellDirective } from '../base-cell.directive';
import { AuthenticationService } from '../../../core/services/authentication.service';

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
    SelectFilenameDirective,
  ],
  templateUrl: './file-name-cell.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class FileNameCellComponent<
  T extends BaseFile,
> extends BaseCellDirective<T> {
  private readonly authService = inject(AuthenticationService);
  editingId = input<number | null>(null);

  rename = output<{ file: T; newName: string }>();
  fileRenameKeyDown = output<{ event: KeyboardEvent; file: T }>();
  stopFilesUpload = output<T[]>();
  continueFilesUpload = output<T[]>();

  FileStatus = FileStatus;
  ProgressStatus = ProgressStatus;
  isUserCreatedFile = computed(
    () => this.file().createdBy == this.authService.currentUser()?.id,
  );

  getFileSize(sizeStr: string): number {
    return +(sizeStr.split(' ')[0] ?? 0);
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
