import { Component, inject } from '@angular/core';
import { NgbActiveModal } from '@ng-bootstrap/ng-bootstrap';

@Component({
  selector: 'app-keyboard-shortcuts-modal',
  templateUrl: './keyboard-shortcuts-modal.component.html',
  styleUrls: ['./keyboard-shortcuts-modal.component.scss']
})
export class KeyboardShortcutsModalComponent {
  readonly activeModal = inject(NgbActiveModal);

  shortcuts = [
    { keys: ['Arrow Up ▲', 'Arrow Down ▼'], description: 'Navigate files list' },
    { keys: ['Home', 'End'], description: 'Jump to top or bottom of the list' },
    { keys: ['Shift', 'Click / Arrows'], description: 'Select a range of files' },
    { keys: ['Ctrl', 'Click'], description: 'Toggle single file selection' },
    { keys: ['Ctrl', 'A'], description: 'Select all files' },
    { keys: ['Enter'], description: 'Open selected directory' },
    { keys: ['F2'], description: 'Rename selected file' },
    { keys: ['Ctrl', 'Shift', 'N'], description: 'Create new folder' },
    { keys: ['Alt', 'Arrow Up ▲'], description: 'Navigate to parent directory' },
    { keys: ['Delete'], description: 'Delete selected file(s)' },
    { keys: ['F3'], description: 'Focus search bar' },
  ];
}
