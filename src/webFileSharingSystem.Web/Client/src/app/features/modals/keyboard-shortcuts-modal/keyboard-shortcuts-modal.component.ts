import { Component, inject } from '@angular/core';
import { NgbActiveModal } from '@ng-bootstrap/ng-bootstrap';

@Component({
  selector: 'app-keyboard-shortcuts-modal',
  templateUrl: './keyboard-shortcuts-modal.component.html',
  styleUrls: ['./keyboard-shortcuts-modal.component.scss'],
})
export class KeyboardShortcutsModalComponent {
  readonly activeModal = inject(NgbActiveModal);
  readonly arrows = $localize`Arrow keys`;
  readonly arrowUp = $localize`Arrow Up`;
  readonly arrowDown = $localize`Arrow Down`;
  readonly click = $localize`Click`;

  shortcuts = [
    {
      keys: [`${this.arrowUp} ▲`, `${this.arrowDown} ▼`],
      description: $localize`Navigate files list`,
    },
    {
      keys: ['Home', 'End'],
      description: $localize`Jump to top or bottom of the list`,
    },
    {
      keys: ['Shift', `${this.click} / ${this.arrows}`],
      description: $localize`Select a range of files`,
    },
    {
      keys: ['Ctrl', `${this.click}`],
      description: $localize`Toggle single file selection`,
    },
    { keys: ['Ctrl', 'A'], description: $localize`Select all files` },
    { keys: ['Enter'], description: $localize`Open selected directory` },
    { keys: ['F2'], description: $localize`Rename selected file` },
    { keys: ['Ctrl', 'Shift', 'N'], description: $localize`Create new folder` },
    {
      keys: ['Alt', `${this.arrowUp} ▲`],
      description: $localize`Navigate to parent directory`,
    },
    { keys: ['Delete'], description: $localize`Delete selected file(s)` },
    { keys: ['F3'], description: $localize`Focus search bar` },
  ];
}
