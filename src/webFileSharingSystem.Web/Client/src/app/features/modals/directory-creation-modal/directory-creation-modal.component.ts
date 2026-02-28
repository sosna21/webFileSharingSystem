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
  selector: 'app-directory-creation-modal',
  imports: [FormsModule, SelectFilenameDirective],
  templateUrl: './directory-creation-modal.component.html',
  styleUrl: './directory-creation-modal.component.scss',
  host: {
    '(window:keydown.enter)': 'onEnterKey()',
  },
})
export class DirectoryCreationModalComponent {
  readonly activeModal = inject(NgbActiveModal);

  readonly startDirName = model<string>('');
  readonly blacklistedNames = model<Set<string>>(new Set());

  readonly newDirName = linkedSignal<string>(() => this.startDirName());
  readonly isNameValid = computed(
    () => !this.blacklistedNames().has(this.newDirName()),
  );

  confirm() {
    if (!this.isNameValid()) return;

    this.activeModal.close(this.newDirName());
  }

  onEnterKey() {
    this.confirm();
  }
}
