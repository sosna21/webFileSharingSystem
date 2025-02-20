import { Component, inject } from '@angular/core';
import { NgbDropdownModule } from '@ng-bootstrap/ng-bootstrap';
import { AuthenticationService } from '../../../../core/services/authentication.service';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'app-profile-dropdown',
  imports: [NgbDropdownModule, RouterLink],
  templateUrl: './profile-dropdown.component.html',
  styleUrl: './profile-dropdown.component.scss',
})
export class ProfileDropdownComponent {
  private authService = inject(AuthenticationService);
  userName = 'John Doe';

  logout() {
    this.authService.logout();
  }
}
