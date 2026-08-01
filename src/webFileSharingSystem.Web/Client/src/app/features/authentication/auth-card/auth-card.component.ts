import { Component, input, model } from '@angular/core';
import { GoogleAccountAuthComponent } from './google-account-auth/google-account-auth.component';

@Component({
  selector: 'app-auth-card',
  imports: [GoogleAccountAuthComponent],
  templateUrl: './auth-card.component.html',
  styleUrl: './auth-card.component.scss',
  host: {
    class: 'col-12 col-sm-10 col-md-8 col-lg-7 col-xl-1  px-2',
  },
})
export class AuthCardComponent {
  headerText = input('Welcome');
  subHeaderText = input('Please fill in the form to continue');
  includeExternalLogins = input(true);
  loading = model.required<boolean>();

  changeLoading($event: boolean) {
    this.loading.set($event);
  }
}
