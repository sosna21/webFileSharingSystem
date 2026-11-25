import { ComponentFixture, TestBed } from '@angular/core/testing';

import { MainActionBtnComponent } from './main-action-btn.component';

describe('MainActionBtnComponent', () => {
  let component: MainActionBtnComponent;
  let fixture: ComponentFixture<MainActionBtnComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [MainActionBtnComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(MainActionBtnComponent);
    component = fixture.componentInstance;
  });

  it('disables the button and shows its spinner while loading', () => {
    fixture.componentRef.setInput('loading', false);
    fixture.componentRef.setInput('testId', 'submit-button');
    fixture.detectChanges();

    const button = fixture.nativeElement.querySelector(
      'button',
    ) as HTMLButtonElement;
    expect(button.disabled).toBe(false);
    expect(button.getAttribute('data-testid')).toBe('submit-button');
    expect(button.querySelector('.spinner-border')).toBeNull();

    fixture.componentRef.setInput('loading', true);
    fixture.detectChanges();

    expect(button.disabled).toBe(true);
    expect(button.querySelector('.spinner-border')).not.toBeNull();
  });
});
