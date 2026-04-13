import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  inject,
} from '@angular/core';
import { NgbDropdownModule } from '@ng-bootstrap/ng-bootstrap';
import { AuthenticationService } from '../../../../core/services/authentication.service';
import { Router, RouterLink } from '@angular/router';
import { finalize } from 'rxjs/operators';
import { HoverClassDirective } from '../../../../core/directives/hover-class.directive';
import { UserPhotoService } from '../../../../core/services/user-photo.service';

@Component({
  selector: 'app-profile-dropdown',
  imports: [NgbDropdownModule, RouterLink, HoverClassDirective],
  templateUrl: './profile-dropdown.component.html',
  styleUrl: './profile-dropdown.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ProfileDropdownComponent {
  private readonly authService = inject(AuthenticationService);
  private readonly userPhotoService = inject(UserPhotoService);
  private readonly router = inject(Router);

  readonly currentUser = this.authService.currentUser;
  readonly userName = computed(() => this.currentUser()?.userName ?? 'User');
  readonly userPhotoUrl = computed(() => {
    const photoUrl = this.currentUser()?.photoUrl;
    return this.userPhotoService.getPhotoUrl(photoUrl);
  });

  constructor() {
    effect((onCleanup) => {
      const photoUrl = this.currentUser()?.photoUrl;
      if (!photoUrl) {
        return;
      }

      const sub = this.userPhotoService.ensurePhotoLoaded(photoUrl).subscribe();
      onCleanup(() => sub.unsubscribe());
    });
  }

  logout() {
    this.authService
      .logout()
      .pipe(
        finalize(() => {
          this.router.navigate(['/login']);
        }),
      )
      .subscribe();
  }
}
