import {
  Component,
  computed,
  inject,
  linkedSignal,
  model,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { NgbActiveModal } from '@ng-bootstrap/ng-bootstrap';
import { SelectFilenameDirective } from '../../../core/directives/select-filename.directive';

@Component({
  selector: 'app-file-rename-modal',
  imports: [FormsModule, SelectFilenameDirective],
  templateUrl: './file-rename-modal.component.html',
  styleUrl: './file-rename-modal.component.scss',
  host: {
    '(window:keydown.enter)': 'onEnterKey()',
  },
})
export class FileRenameModalComponent {
  readonly activeModal = inject(NgbActiveModal);

  readonly startFileName = model<string>('');
  readonly blacklistedNames = model<Set<string>>(new Set());

  readonly newFileName = linkedSignal<string>(() => this.startFileName());
  readonly isNameValid = computed(
    () => !this.blacklistedNames().has(this.newFileName()),
  );

  confirm() {
    if (!this.isNameValid()) return;

    this.activeModal.close(this.newFileName());
  }

  onEnterKey() {
    this.confirm();
  }
}
