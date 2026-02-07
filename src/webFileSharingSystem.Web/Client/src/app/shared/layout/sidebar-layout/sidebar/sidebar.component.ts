import { Component, inject, model } from '@angular/core';
import { NavLinkComponent } from './nav-link/nav-link.component';
import { NgbProgressbarModule } from '@ng-bootstrap/ng-bootstrap';
import { SpaceUsageBarComponent } from './space-usage-bar/space-usage-bar.component';
import { UploadButtonsComponent } from './upload-buttons/upload-buttons.component';
import { FileService } from '../../../../core/services/file.service';
import { debouncedSignal } from '../../../../core/utils/signal-utils';

@Component({
  selector: 'app-sidebar',
  imports: [
    NavLinkComponent,
    NgbProgressbarModule,
    SpaceUsageBarComponent,
    UploadButtonsComponent,
  ],
  templateUrl: './sidebar.component.html',
  styleUrl: './sidebar.component.scss',
})
export class SidebarComponent {
  private readonly fileService = inject(FileService);
  readonly canUpload = debouncedSignal(
    this.fileService.isParentMinWriteAccess,
    100,
    true,
  );
  isCollapsed = model(true);
}
