import {Component, OnInit} from '@angular/core';
import {AbstractControl, FormBuilder, FormGroup, ValidatorFn, Validators} from "@angular/forms";
import {AuthenticationService} from "../../services/authentication.service";
import {Router} from "@angular/router";
import {ToastrService} from "ngx-toastr";

@Component({
  selector: 'app-register',
  templateUrl: './register.component.html',
  styleUrls: ['./register.component.scss']
})
export class RegisterComponent implements OnInit {
  error = '';
  registerForm!: FormGroup;

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
      email : ['', Validators.email],
      password: ['', [Validators.required, Validators.minLength(6), this.passwordCustomValidators()]],
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

   passwordCustomValidators(): ValidatorFn {
    return (control: AbstractControl): { [key: string]: any } | null => {
      const forbidden = control?.parent?.controls as any;

      let hasNumber = /\d/.test(control.value);
      let hasUpper = /[A-Z]/.test(control.value);
      let hasLower = /[a-z]/.test(control.value);
      let hasNonAlphanumeric = /[^a-zA-Z\d\s:]/.test(control.value)
      const valid = hasNumber && hasUpper && hasLower && hasNonAlphanumeric;

      return (forbidden)
        ? (valid) ? null : {areAllRequiredCharacter: true}
        : null;
    }
  }


  register() {
    this.authenticationService.register(this.registerForm.value).subscribe(response => {
      this.toastr.success("Account created successfully","Account creation result");
      this.router.navigateByUrl('/login');
    }, error => {
      this.error = error.error;
      console.log(error);
    })
  }

}
