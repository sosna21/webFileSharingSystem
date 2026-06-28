import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { FileSizePipe } from '../../../../core/pipes/file-size.pipe';
import {
  BaseFile,
  ProgressStatus,
} from '../../../../core/models/base-file.model';
import { DecimalPipe } from '@angular/common';

@Component({
  selector: 'app-upload-status',
  imports: [FileSizePipe, DecimalPipe],
  templateUrl: './upload-status.component.html',
  styles: ``,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class UploadStatusComponent {
  readonly ProgressStatus = ProgressStatus;
  readonly file = input.required<BaseFile>();
  readonly disableColoring = input<boolean>(false);

  getFileSize(sizeStr: string): number {
    return +(sizeStr.split(' ')[0] ?? 0);
  }
}
