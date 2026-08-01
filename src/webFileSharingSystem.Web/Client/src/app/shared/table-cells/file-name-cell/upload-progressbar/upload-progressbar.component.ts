import { Component, input } from '@angular/core';
import { NgbProgressbarModule } from '@ng-bootstrap/ng-bootstrap';
import {
  BaseFile,
  ProgressStatus,
} from '../../../../core/models/base-file.model';

@Component({
  selector: 'app-upload-progressbar',
  imports: [NgbProgressbarModule],
  templateUrl: './upload-progressbar.component.html',
  styles: ``,
})
export class UploadProgressbarComponent {
  readonly ProgressStatus = ProgressStatus;
  readonly file = input.required<BaseFile>();
}
