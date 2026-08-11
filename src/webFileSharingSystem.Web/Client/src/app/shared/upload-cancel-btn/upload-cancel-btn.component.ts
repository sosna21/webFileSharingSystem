import { Component, output } from '@angular/core';
import { ClicableIconDirective } from '../../core/directives/clicable-icon.directive';
import { NgbTooltipModule } from '@ng-bootstrap/ng-bootstrap';

@Component({
  selector: 'app-upload-cancel-btn',
  imports: [ClicableIconDirective, NgbTooltipModule],
  templateUrl: './upload-cancel-btn.component.html',
  styles: ``,
})
export class UploadCancelBtnComponent {
  readonly click = output();
}
