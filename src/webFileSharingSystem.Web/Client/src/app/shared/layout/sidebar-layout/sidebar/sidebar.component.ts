import { Component, model } from '@angular/core';
import { NavLinkComponent } from './nav-link/nav-link.component';
import { NgbProgressbarModule } from '@ng-bootstrap/ng-bootstrap';
import { SpaceUsageBarComponent } from './space-usage-bar/space-usage-bar.component';
import { UploadButtonsComponent } from "./upload-buttons/upload-buttons.component";

@Component({
  selector: 'app-sidebar',
  imports: [NavLinkComponent, NgbProgressbarModule, SpaceUsageBarComponent, UploadButtonsComponent],
  templateUrl: './sidebar.component.html',
  styleUrl: './sidebar.component.scss',
})
export class SidebarComponent {
  isCollapsed = model(true);
}
