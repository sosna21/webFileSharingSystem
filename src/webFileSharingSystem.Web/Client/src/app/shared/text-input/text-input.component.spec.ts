import { Component } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { FormControl, ReactiveFormsModule, Validators } from '@angular/forms';
import { TextInputComponent } from './text-input.component';

@Component({
  standalone: true,
  imports: [ReactiveFormsModule, TextInputComponent],
  template: `
    <app-text-input
      [formControl]="nameControl"
      label="Name"
      testId="name-input"
    />
  `,
})
class TextInputHostComponent {
  readonly nameControl = new FormControl('', {
    nonNullable: true,
    validators: [Validators.required],
  });
}

describe('TextInputComponent', () => {
  let fixture: ComponentFixture<TextInputHostComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [TextInputHostComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(TextInputHostComponent);
    fixture.detectChanges();
  });

  it('synchronizes the host FormControl and displays validation feedback', () => {
    const control = fixture.componentInstance.nameControl;
    const input = fixture.nativeElement.querySelector(
      'input',
    ) as HTMLInputElement;

    control.setValue('Ada');
    fixture.detectChanges();
    expect(input.value).toBe('Ada');
    expect(input.getAttribute('data-testid')).toBe('name-input');

    input.value = '';
    input.dispatchEvent(new Event('input', { bubbles: true }));
    control.markAsTouched();
    fixture.detectChanges();

    expect(control.value).toBe('');
    expect(input.classList.contains('is-invalid')).toBe(true);
    expect(fixture.nativeElement.textContent).toContain('Please enter a Name');
  });
});
