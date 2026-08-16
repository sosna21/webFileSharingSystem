import { Component, inject, model } from '@angular/core';
import { AuthenticationService } from '../../../core/services/authentication.service';
import { ThemeSwitchComponent } from '../../theme-switch/theme-switch.component';
import { ProfileDropdownComponent } from './profile-dropdown/profile-dropdown.component';
import { FileSearchComponent } from './file-search/file-search.component';
import { NavbarBrandComponent } from './navbar-brand/navbar-brand.component';
import { toSignal } from '@angular/core/rxjs-interop';
import { NavigationEnd, Router } from '@angular/router';
import { filter, map } from 'rxjs';
import { LanguageSwitchComponent } from '../../language-switch/language-switch.component';

@Component({
  selector: 'app-navbar',
  imports: [
    ThemeSwitchComponent,
    ProfileDropdownComponent,
    FileSearchComponent,
    NavbarBrandComponent,
    LanguageSwitchComponent,
  ],
  templateUrl: './navbar.component.html',
  styleUrl: './navbar.component.scss',
})
export class NavbarComponent {
  private readonly router = inject(Router);
  private readonly authenticationService = inject(AuthenticationService);
  authenticated = this.authenticationService.isAuthenticated;
  isSidebarCollapsed = model(true);

  isDiscSubroute = toSignal(
    this.router.events.pipe(
      filter((event) => event instanceof NavigationEnd),
      map(() => this.router.url.startsWith('/disc')),
    ),
    { initialValue: this.router.url.startsWith('/disc') },
  );

  toogleCollapse() {
    this.isSidebarCollapsed.update((value) => !value);
  }
}
