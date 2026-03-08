import {
  ChangeDetectionStrategy,
  Component,
  inject,
  OnInit,
  signal,
} from '@angular/core';
import {
  FormBuilder,
  FormControl,
  FormGroup,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { first } from 'rxjs';

import { AuthenticationService } from '../../../core/services/authentication.service';
import { TextInputComponent } from '../../../shared/text-input/text-input.component';
import { BaseAuthPageComponent } from '../base-auth-page/base-auth-page.component';
import { CardMainContentComponent } from '../auth-card/card-main-content/card-main-content.component';
import { CardSecondaryContentComponent } from '../auth-card/card-secondary-content/card-secondary-content.component';
import { MainActionBtnComponent } from '../auth-card/card-main-content/main-action-btn/main-action-btn.component';

@Component({
  selector: 'app-login',
  imports: [
    RouterLink,
    ReactiveFormsModule,
    TextInputComponent,
    BaseAuthPageComponent,
    CardMainContentComponent,
    CardSecondaryContentComponent,
    MainActionBtnComponent,
  ],
  templateUrl: './login.component.html',
  styleUrl: './login.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class LoginComponent implements OnInit {
  private fb = inject(FormBuilder);
  private router = inject(Router);
  private authenticationService = inject(AuthenticationService);
  loginForm!: FormGroup;
  loading = signal(false);
  error = signal<string | null>(null);
  returnUrl: string = '';

  ngOnInit(): void {
    this.loginForm = this.fb.group({
      username: ['', Validators.required],
      password: ['', Validators.required],
    });
  }

  onSubmit() {
    if (this.loginForm!.invalid) {
      this.validateAllFormFields(this.loginForm);
      return;
    }

    this.loading.set(true);
    const username = this.loginForm.get('username')?.value;
    const password = this.loginForm.get('password')?.value;
    if (!(username && password)) return;
    this.authenticationService
      .login(username, password)
      .pipe(first())
      .subscribe({
        next: (_) => {
          this.router.navigate([this.returnUrl]);
        },
        error: (error) => {
          this.loading.set(false);
          if (error?.error?.message) this.error.set(error.error.message);
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
  resetError() {
    this.error.set(null);
  }
}
