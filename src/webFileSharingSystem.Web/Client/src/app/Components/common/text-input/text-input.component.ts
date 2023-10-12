import {Component, Input, Output, Self, ViewChild} from '@angular/core';
import {ControlValueAccessor, NgControl} from "@angular/forms";

@Component({
  selector: 'app-text-input',
  templateUrl: './text-input.component.html',
  styleUrls: ['./text-input.component.scss']
})
export class TextInputComponent implements ControlValueAccessor {
  @Input() label!: string;
  @Input() type = 'text';
  @Input() value = '';
  @Input() errors = true;
  @Input() marginBtm = '1em';
  @ViewChild('inputElement') private input: any;

  constructor(@Self() public ngControl: NgControl) {
    this.ngControl.valueAccessor = this;
  }

  registerOnChange(fn: any): void {
  }

  registerOnTouched(fn: any): void {
  }

  writeValue(obj: any): void {
  }

  setFocus() {
    this.input.nativeElement.focus();
  }

  textSelect() {
    this.input.nativeElement.select();
  }
}
