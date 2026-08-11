import { Component, inject, OnInit, signal } from '@angular/core';
import { TextInputComponent } from '../../../shared/text-input/text-input.component';
import {
  FormGroup,
  FormBuilder,
  Validators,
  ValidatorFn,
  AbstractControl,
  FormControl,
  ReactiveFormsModule,
} from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { AuthenticationService } from '../../../core/services/authentication.service';
import { BaseAuthPageComponent } from '../base-auth-page/base-auth-page.component';
import { CardMainContentComponent } from '../auth-card/card-main-content/card-main-content.component';
import { MainActionBtnComponent } from '../auth-card/card-main-content/main-action-btn/main-action-btn.component';
import { CardSecondaryContentComponent } from '../auth-card/card-secondary-content/card-secondary-content.component';
import { ToastService } from '../../../core/services/toast.service';
import { MessageSeverity } from '../../../core/models/toast-info.model';

@Component({
  selector: 'app-register',
  imports: [
    ReactiveFormsModule,
    RouterLink,
    TextInputComponent,
    BaseAuthPageComponent,
    CardMainContentComponent,
    MainActionBtnComponent,
    CardSecondaryContentComponent,
  ],
  templateUrl: './register.component.html',
  styleUrl: './register.component.scss',
})
export class RegisterComponent implements OnInit {
  private fb = inject(FormBuilder);
  private router = inject(Router);
  private authenticationService = inject(AuthenticationService);
  private toast = inject(ToastService);
  registerForm!: FormGroup;
  loading = signal(false);
  error = signal<string | null>(null);

  ngOnInit(): void {
    this.initializeForm();
  }

  initializeForm() {
    this.registerForm = this.fb.group({
      username: ['', Validators.required],
      email: ['', Validators.email],
      password: [
        '',
        [
          Validators.required,
          Validators.minLength(6),
          this.passwordCustomValidator(),
        ],
      ],
      confirmPassword: [
        '',
        [Validators.required, this.matchValues('password')],
      ],
    });

    this.registerForm.get('password')?.valueChanges.subscribe(() => {
      this.registerForm.get('confirmPassword')?.updateValueAndValidity();
    });
  }

  matchValues(matchTo: string): ValidatorFn {
    return (control: AbstractControl): { [key: string]: any } | null => {
      const forbidden = control?.parent?.controls as any;
      return forbidden
        ? control?.value === forbidden[matchTo]?.value
          ? null
          : { isMatching: true }
        : null;
    };
  }

  passwordCustomValidator(): ValidatorFn {
    return (control: AbstractControl): { [key: string]: any } | null => {
      const forbidden = control?.parent?.controls as any;

      const hasNumber = /\d/.test(control.value);
      const hasUpper = /[A-Z]/.test(control.value);
      const hasLower = /[a-z]/.test(control.value);
      const hasNonAlphanumeric = /[^a-zA-Z\d\s:]/.test(control.value);
      const valid = hasNumber && hasUpper && hasLower && hasNonAlphanumeric;

      return forbidden
        ? valid
          ? null
          : { passwordConstraintsSatisfied: true }
        : null;
    };
  }

  onSubmit() {
    // stop here if form is invalid
    if (this.registerForm!.invalid) {
      this.validateAllFormFields(this.registerForm);
      return;
    }

    this.loading.set(true);

    this.authenticationService.register(this.registerForm.value).subscribe({
      next: () => {
        this.router.navigate(['/login']);
        this.toast.show(
          'Account created',
          'You can now log in and start using the app.',
          MessageSeverity.success,
        );
      },
      error: (error) => {
        this.error.set(error.error);
        this.loading.set(false);
      },
    });
  }

  private validateAllFormFields(formGroup: FormGroup) {
    Object.keys(formGroup.controls).forEach((field) => {
      const control = formGroup.get(field);
      if (control instanceof FormControl) {
        control.markAsTouched({ onlySelf: true });
      } else if (control instanceof FormGroup) {
        this.validateAllFormFields(control);
      }
    });
  }
}
