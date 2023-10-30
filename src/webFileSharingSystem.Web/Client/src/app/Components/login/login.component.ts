import {AfterViewInit, Component, OnInit} from '@angular/core';
import {Router, ActivatedRoute} from '@angular/router';
import {FormBuilder, FormControl, FormGroup, Validators} from '@angular/forms';
import {first} from 'rxjs/operators';
import {AuthenticationService} from '../../services/authentication.service';
import {CredentialResponse, PromptMomentNotification} from 'google-one-tap'

@Component({
  selector: 'app-login',
  templateUrl: './login.component.html',
  styleUrls: ['./login.component.scss']
})
export class LoginComponent implements OnInit {
  loginForm!: FormGroup;
  loading = false;
  returnUrl: string = "";
  error = '';

  constructor(
    private formBuilder: FormBuilder,
    private route: ActivatedRoute,
    private router: Router,
    private authenticationService: AuthenticationService
  ) {
    // redirect to files if already logged in
    if (this.authenticationService.currentUserValue) {
      this.router.navigate(['files']);
    }
  }

  ngOnInit(): void {
    this.loginForm = this.formBuilder.group({
      username: ['', Validators.required],
      password: ['', Validators.required]
    });

    // get return url from route parameters or default to 'files'
    this.returnUrl = this.route.snapshot.queryParams['returnUrl'] || 'files';

    window.onload = () => {
      // @ts-ignore
      google.accounts.id.initialize({
        client_id: "",
        callback: this.handleCredentialResponse.bind(this),
        auto_select: false,
        cancel_on_tap_outside: true
      });
      // @ts-ignore
      google.accounts.id.disableAutoSelect();
      // @ts-ignore
      google.accounts.id.renderButton(
        // @ts-ignore
        document.getElementById("buttonDiv"),
        { theme: "outline", size: "large", width: "100%" }
      );
      // @ts-ignore
      google.accounts.id.prompt((notification: PromptMomentNotification) => {});
    };
  }

   handleCredentialResponse(response: CredentialResponse) {
    this.loading = true;
    this.authenticationService.loginWithGoogle(response.credential)
      .pipe(first())
      .subscribe(
        () => {
          this.router.navigate(['files']);
        }, error => {
          this.error = error.error.message;
          this.loading = false;
        });
  }

  // async handleCredentialResponse(response: CredentialResponse) {
  //   this.loading = true;
  //   this.authenticationService.loginWithGoogle(response.credential)
  //     .pipe(first())
  //     .subscribe(
  //       () => {
  //         this.router.navigate([this.returnUrl]);
  //       }, error => {
  //         this.error = error.error.message;
  //         this.loading = false;
  //       });
  // }

  // convenience getter for easy access to form fields
  get form() {
    return this.loginForm!.controls;
  }

  onSubmit() {
    // stop here if form is invalid
    if (this.loginForm!.invalid) {
      this.validateAllFormFields(this.loginForm);
      return;
    }

    this.loading = true;
    this.authenticationService.login(this.form.username.value, this.form.password.value)
      .pipe(first())
      .subscribe(
        () => {
          this.router.navigate([this.returnUrl]);
        }, error => {
          this.error = error.error.message;
          this.loading = false;
        });
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

  resetError(){
    this.error = '';
  }
}

