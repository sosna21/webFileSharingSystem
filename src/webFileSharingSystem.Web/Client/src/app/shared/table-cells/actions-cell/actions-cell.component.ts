import { Component, output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { BaseFile } from '../../../core/models/base-file.model';
import { NgbTooltipModule } from '@ng-bootstrap/ng-bootstrap';
import { ClicableIconDirective } from '../../../core/directives/clicable-icon.directive';
import { BaseCellDirective } from '../base-cell.directive';

@Component({
  selector: 'app-actions-cell',
  imports: [CommonModule, NgbTooltipModule, ClicableIconDirective],
  templateUrl: './actions-cell.component.html',
})
export class ActionsCellComponent<
  T extends BaseFile,
> extends BaseCellDirective<T> {
  actionIconClick = output<{ event: MouseEvent; icon: HTMLElement; file: T }>();

  onActionIconClick(event: MouseEvent, icon: HTMLElement, file: T) {
    this.actionIconClick.emit({ event, icon, file });
  }
}
