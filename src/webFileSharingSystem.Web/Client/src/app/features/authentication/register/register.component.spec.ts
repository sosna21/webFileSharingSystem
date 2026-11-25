import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { of } from 'rxjs';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { MessageSeverity } from '../../../core/models/toast-info.model';
import { AuthenticationService } from '../../../core/services/authentication.service';
import { ToastService } from '../../../core/services/toast.service';
import { RegisterComponent } from './register.component';

describe('RegisterComponent', () => {
  let component: RegisterComponent;
  let fixture: ComponentFixture<RegisterComponent>;
  let register: ReturnType<typeof vi.fn>;
  let navigate: ReturnType<typeof vi.fn>;
  let showToast: ReturnType<typeof vi.fn>;

  beforeEach(async () => {
    register = vi.fn(() => of(null));
    navigate = vi.fn(() => Promise.resolve(true));
    showToast = vi.fn();

    await TestBed.configureTestingModule({
      imports: [RegisterComponent],
      providers: [
        { provide: AuthenticationService, useValue: { register } },
        { provide: Router, useValue: { navigate } },
        { provide: ToastService, useValue: { show: showToast } },
      ],
    })
      .overrideComponent(RegisterComponent, { set: { template: '' } })
      .compileComponents();

    fixture = TestBed.createComponent(RegisterComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('validates password rules and confirmation matching', () => {
    component.registerForm.patchValue({
      username: 'ada',
      password: 'abc123',
      confirmPassword: 'abc123',
    });

    expect(
      component.registerForm
        .get('password')
        ?.hasError('passwordConstraintsSatisfied'),
    ).toBe(true);
    expect(
      component.registerForm.get('confirmPassword')?.hasError('isMatching'),
    ).toBe(false);

    component.registerForm.get('password')?.setValue('Abc123!');
    expect(
      component.registerForm.get('confirmPassword')?.hasError('isMatching'),
    ).toBe(true);

    component.registerForm.get('confirmPassword')?.setValue('Abc123!');
    expect(component.registerForm.valid).toBe(true);
  });

  it('registers valid details, navigates to login, and shows success', () => {
    component.registerForm.setValue({
      username: 'ada',
      email: '',
      password: 'Abc123!',
      confirmPassword: 'Abc123!',
    });

    component.onSubmit();

    expect(register).toHaveBeenCalledWith(component.registerForm.value);
    expect(navigate).toHaveBeenCalledWith(['/login']);
    expect(showToast).toHaveBeenCalledWith(
      'Account created',
      'You can now log in and start using the app.',
      MessageSeverity.success,
    );
  });
});
