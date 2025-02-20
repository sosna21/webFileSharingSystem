import { Component, model } from '@angular/core';
import { NavLinkComponent } from './nav-link/nav-link.component';

@Component({
  selector: 'app-sidebar',
  imports: [NavLinkComponent],
  templateUrl: './sidebar.component.html',
  styleUrl: './sidebar.component.scss',
})
export class SidebarComponent {
  isCollapsed = model(true);
}
