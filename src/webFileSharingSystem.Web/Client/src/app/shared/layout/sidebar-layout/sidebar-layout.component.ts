import { ChangeDetectionStrategy, Component } from '@angular/core';
import { NavbarComponent } from '../navbar/navbar.component';
import { SidebarComponent } from './sidebar/sidebar.component';
import { RouterOutlet } from '@angular/router';

@Component({
  selector: 'app-sidebar-layout',
  imports: [RouterOutlet, NavbarComponent, SidebarComponent],
  templateUrl: './sidebar-layout.component.html',
  styleUrl: './sidebar-layout.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SidebarLayoutComponent {}
