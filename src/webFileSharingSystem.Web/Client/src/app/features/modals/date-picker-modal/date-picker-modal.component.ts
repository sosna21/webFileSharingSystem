import { ChangeDetectionStrategy, Component, inject, linkedSignal, model, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { NgbActiveModal, NgbDateStruct, NgbDatepickerModule, NgbTimeStruct, NgbTimepicker } from '@ng-bootstrap/ng-bootstrap';
import { DateUtils } from '../../../core/utils/date-utils';

@Component({
  selector: 'app-date-picker-modal',
  imports: [FormsModule, NgbDatepickerModule, NgbTimepicker],
  templateUrl: './date-picker-modal.component.html',
  styleUrl: './date-picker-modal.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    '(window:keydown.enter)': 'onEnterKey()',
  },
})
export class DatePickerModalComponent {
  readonly activeModal = inject(NgbActiveModal);
  readonly title = model('Select Date');
  readonly confirmText = model('Confirm');
  readonly cancelText = model('Cancel');
  readonly pickTime = model<boolean>(true);
  readonly date = model<NgbDateStruct | null>(null); // linked callendar date
  readonly minDate = model<NgbDateStruct | null>(null);
  readonly maxDate = model<NgbDateStruct | null>(null);
  readonly time = model<NgbTimeStruct | null>({ hour: 12, minute: 0, second: 0 });

  readonly linkedDate = linkedSignal<NgbDateStruct | null>(() => this.date()); //inpuDate - main

  confirm() {
    if (!this.date()) this.activeModal.close(null);
    if (!this.pickTime()) this.activeModal.close(DateUtils.structToDate(this.date()!));
    if (!this.time()) this.activeModal.close(null);
    // Combine date and time into a single Date object
    const combinedDate = new Date(Date.UTC(
      this.date()!.year,
      this.date()!.month - 1,
      this.date()!.day,
      this.time()!.hour,
      this.time()!.minute,
      this.time()!.second
    ));
    
    this.activeModal.close(combinedDate);
  }

  onEnterKey() {
    if (this.date()) {
      if (this.minDate()) if (this.date()! < this.minDate()!) return;
      if (this.maxDate()) if (this.date()! > this.maxDate()!) return;
      this.confirm();
    }
  }

  updateLinkedDate($event: NgbDateStruct | null) {
    if (!$event) return;
    this.date.set($event);
  }

}
