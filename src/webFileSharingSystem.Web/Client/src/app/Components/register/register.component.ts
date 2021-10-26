import {Component, OnInit} from '@angular/core';
import {AbstractControl, FormBuilder, FormControl, FormGroup, ValidatorFn, Validators} from "@angular/forms";
import {AuthenticationService} from "../../services/authentication.service";
import {Router} from "@angular/router";
import {ToastrService} from "ngx-toastr";

@Component({
  selector: 'app-register',
  templateUrl: './register.component.html',
  styleUrls: ['./register.component.scss']
})
export class RegisterComponent implements OnInit {
  registerForm!: FormGroup;
  loading = false;
  error = '';

  constructor(private formBuilder: FormBuilder,
              private router: Router,
              private authenticationService: AuthenticationService,
              private toastr: ToastrService) {
    // redirect to home if already logged in
    if (this.authenticationService.currentUserValue) {
      this.router.navigate(['/']);
    }
  }

  ngOnInit(): void {
    this.initializeForm();
  }

  initializeForm() {
    this.registerForm = this.formBuilder.group({
      username: ['', Validators.required],
      email: ['', Validators.email],
      password: ['', [Validators.required, Validators.minLength(6), this.passwordCustomValidator()]],
      confirmPassword: ['', [Validators.required, this.matchValues('password')]],
    })

    this.registerForm.controls.password?.valueChanges.subscribe(() => {
      this.registerForm.controls.confirmPassword?.updateValueAndValidity();
    })
  }

  matchValues(matchTo: string): ValidatorFn {
    return (control: AbstractControl): { [key: string]: any } | null => {
      const forbidden = control?.parent?.controls as any;
      return (forbidden)
        ? (control?.value === forbidden[matchTo]?.value) ? null : {isMatching: true}
        : null;
    }
  }

  passwordCustomValidator(): ValidatorFn {
    return (control: AbstractControl): { [key: string]: any } | null => {
      const forbidden = control?.parent?.controls as any;

      const hasNumber = /\d/.test(control.value);
      const hasUpper = /[A-Z]/.test(control.value);
      const hasLower = /[a-z]/.test(control.value);
      const hasNonAlphanumeric = /[^a-zA-Z\d\s:]/.test(control.value);
      const valid = hasNumber && hasUpper && hasLower && hasNonAlphanumeric;

      return (forbidden)
        ? (valid) ? null : {passwordConstraintsSatisfied: true}
        : null;
    }
  }

  onSubmit() {
    // stop here if form is invalid
    if (this.registerForm!.invalid) {
      this.validateAllFormFields(this.registerForm);
      return;
    }

    this.loading = true;

    this.authenticationService.register(this.registerForm.value).subscribe(() => {
      this.toastr.success("Account created successfully", "Account creation result");
      this.router.navigateByUrl('/login');
    }, error => {
      this.error = error.error;
      this.loading = false;
    })
  }

  private validateAllFormFields(formGroup: FormGroup) {
    Object.keys(formGroup.controls).forEach(field => {
      const control = formGroup.get(field);
      if (control instanceof FormControl) {
        control.markAsTouched({onlySelf: true});
      } else if (control instanceof FormGroup) {
        this.validateAllFormFields(control);
      }
    });
  }
}
