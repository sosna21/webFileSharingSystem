import { Component, model } from '@angular/core';
import { NavLinkComponent } from './nav-link/nav-link.component';
import { NgbProgressbarModule } from '@ng-bootstrap/ng-bootstrap';
import { SpaceUsageBarComponent } from './space-usage-bar/space-usage-bar.component';

@Component({
  selector: 'app-sidebar',
  imports: [NavLinkComponent, NgbProgressbarModule, SpaceUsageBarComponent],
  templateUrl: './sidebar.component.html',
  styleUrl: './sidebar.component.scss',
})
export class SidebarComponent {
  isCollapsed = model(true);
}
