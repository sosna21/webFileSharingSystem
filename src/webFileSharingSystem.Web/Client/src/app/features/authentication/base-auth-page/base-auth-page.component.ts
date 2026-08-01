import { Component, input, model } from '@angular/core';
import { AuthCardComponent } from '../auth-card/auth-card.component';

@Component({
  selector: 'app-base-auth-page',
  imports: [AuthCardComponent],
  templateUrl: './base-auth-page.component.html',
  styleUrl: './base-auth-page.component.scss',
})
export class BaseAuthPageComponent {
  loading = model.required<boolean>();
  includeExternalLogins = input(true);
}
