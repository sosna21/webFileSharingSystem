import { Component, input, output } from '@angular/core';
import { ClicableIconDirective } from '../../../../core/directives/clicable-icon.directive';
import {
  BaseFile,
  ProgressStatus,
} from '../../../../core/models/base-file.model';
import { NgbTooltipModule } from '@ng-bootstrap/ng-bootstrap';

@Component({
  selector: 'app-upload-control-btns',
  imports: [ClicableIconDirective, NgbTooltipModule],
  templateUrl: './upload-control-btns.component.html',
  styles: ``,
  host: {
    class: 'd-flex',
  },
})
export class UploadControlBtnsComponent {
  readonly ProgressStatus = ProgressStatus;
  readonly file = input.required<BaseFile>();

  readonly pause = output();
  readonly continue = output();
}
