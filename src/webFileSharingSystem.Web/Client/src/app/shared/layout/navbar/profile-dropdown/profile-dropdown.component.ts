import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { NgbDropdownModule } from '@ng-bootstrap/ng-bootstrap';
import { AuthenticationService } from '../../../../core/services/authentication.service';
import { Router, RouterLink } from '@angular/router';
import { finalize } from 'rxjs/operators';

@Component({
  selector: 'app-profile-dropdown',
  imports: [NgbDropdownModule, RouterLink],
  templateUrl: './profile-dropdown.component.html',
  styleUrl: './profile-dropdown.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class ProfileDropdownComponent {
  private authService = inject(AuthenticationService);
  private router = inject(Router);
  userName = this.authService.currentUser()?.userName ?? 'User';
  userPhotoUrl = null;

  logout() {
    this.authService.logout().pipe(
    finalize(() => {
        this.router.navigate(['/login']);
      })
    ).subscribe();
  }
}
