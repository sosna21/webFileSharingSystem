import { ChangeDetectionStrategy, Component, computed, inject, model } from '@angular/core';
import { AuthenticationService } from '../../../core/services/authentication.service';
import { ThemeSwitchComponent } from "../../theme-switch/theme-switch.component";
import { ProfileDropdownComponent } from "./profile-dropdown/profile-dropdown.component";
import { FileSearchComponent } from "./file-search/file-search.component";
import { NavbarBrandComponent } from "./navbar-brand/navbar-brand.component";

@Component({
  selector: 'app-navbar',
  imports: [ThemeSwitchComponent, ProfileDropdownComponent, FileSearchComponent, NavbarBrandComponent],
  templateUrl: './navbar.component.html',
  styleUrl: './navbar.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class NavbarComponent {
  private authenticationService = inject(AuthenticationService);
  authenticated = this.authenticationService.isAuthenticated;
  isSidebarCollapsed = model(true);

  toogleCollapse() {
    this.isSidebarCollapsed.update(value => !value);
  }
}
