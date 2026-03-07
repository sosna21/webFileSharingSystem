import { Directive, input, output } from '@angular/core';
import { BaseFile } from '../../core/models/base-file.model';

@Directive({
  host: {
    '(contextmenu)': 'onContextMenuClick($event, file())',
  },
})
export class BaseCellDirective<T extends BaseFile> {
  file = input.required<T>();

  contextMenuClick = output<{ event: MouseEvent; file: T }>();

  onContextMenuClick(event: MouseEvent, file: T) {
    this.contextMenuClick.emit({ event, file });
  }
}
