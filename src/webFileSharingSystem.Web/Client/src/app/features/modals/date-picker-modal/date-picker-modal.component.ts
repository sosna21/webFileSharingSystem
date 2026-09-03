import { Component, inject, linkedSignal, model } from '@angular/core';
import { FormsModule } from '@angular/forms';
import {
  NgbActiveModal,
  NgbDateStruct,
  NgbDatepickerModule,
  NgbTimeStruct,
  NgbTimepicker,
} from '@ng-bootstrap/ng-bootstrap';
import { DateUtils } from '../../../core/utils/date-utils';

@Component({
  selector: 'app-date-picker-modal',
  imports: [FormsModule, NgbDatepickerModule, NgbTimepicker],
  templateUrl: './date-picker-modal.component.html',
  styleUrl: './date-picker-modal.component.scss',
  host: {
    '(window:keydown.enter)': 'onEnterKey()',
  },
})
export class DatePickerModalComponent {
  readonly activeModal = inject(NgbActiveModal);
  readonly title = model($localize`Select Date`);
  readonly confirmText = model($localize`Confirm`);
  readonly cancelText = model($localize`Cancel`);
  readonly pickTime = model<boolean>(true);
  readonly date = model<NgbDateStruct | null>(null); // linked callendar date
  readonly minDate = model<NgbDateStruct | null>(null);
  readonly maxDate = model<NgbDateStruct | null>(null);
  readonly time = model<NgbTimeStruct | null>({
    hour: 12,
    minute: 0,
    second: 0,
  });

  readonly linkedDate = linkedSignal<NgbDateStruct | null>(() => this.date()); //inpuDate - main

  confirm() {
    const date = this.date();
    if (!date) {
      this.activeModal.close(null);
      return;
    }

    if (!this.pickTime()) {
      this.activeModal.close(DateUtils.structToDate(date));
      return;
    }

    const time = this.time();
    if (!time) {
      this.activeModal.close(null);
      return;
    }

    const combinedDate = new Date(
      date.year,
      date.month - 1,
      date.day,
      time.hour,
      time.minute,
      time.second,
      0,
    );

    this.activeModal.close(combinedDate);
  }

  onEnterKey() {
    const date = this.date();
    if (!date || this.isDateOutOfBounds(date)) {
      return;
    }

    this.confirm();
  }

  updateLinkedDate($event: NgbDateStruct | null) {
    if (!$event) return;
    this.date.set($event);
  }

  private isDateOutOfBounds(date: NgbDateStruct): boolean {
    const selectedTimestamp = new Date(
      date.year,
      date.month - 1,
      date.day,
    ).getTime();

    const minDate = this.minDate();
    if (minDate) {
      const minTimestamp = new Date(
        minDate.year,
        minDate.month - 1,
        minDate.day,
      ).getTime();
      if (selectedTimestamp < minTimestamp) {
        return true;
      }
    }

    const maxDate = this.maxDate();
    if (maxDate) {
      const maxTimestamp = new Date(
        maxDate.year,
        maxDate.month - 1,
        maxDate.day,
      ).getTime();
      if (selectedTimestamp > maxTimestamp) {
        return true;
      }
    }

    return false;
  }
}
