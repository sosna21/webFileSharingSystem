import { Component, inject } from '@angular/core';
import {
  NgbCollapseModule,
  NgbPaginationModule,
} from '@ng-bootstrap/ng-bootstrap';
import { FileService } from '../../../core/services/file.service';
import { BaseDiscPageHeaderComponent } from '../base-disc-page/base-disc-page-header/base-disc-page-header.component';
import { BaseDiscPageComponent } from '../base-disc-page/base-disc-page.component';
import { BreadcrumbComponent } from '../../../shared/breadcrumb/breadcrumb.component';
import { FileActionsStripComponent } from './file-actions-strip/file-actions-strip.component';
import { AppFile } from '../../../core/models/app-file.model';
import { SelectionService } from '../../../core/services/selection.service';
import { UserFilesViewComponent } from '../../../shared/user-files-view/user-files-view.component';
import { StateService } from '../../../core/services/state.service';

@Component({
  selector: 'app-home',
  imports: [
    NgbCollapseModule,
    NgbPaginationModule,
    BaseDiscPageHeaderComponent,
    BaseDiscPageComponent,
    BreadcrumbComponent,
    FileActionsStripComponent,
    UserFilesViewComponent,
  ],
  providers: [SelectionService<AppFile>],
  templateUrl: './home.component.html',
  styleUrl: './home.component.scss',
})
export class HomeComponent {
  private readonly fileService = inject(FileService);
  private readonly selectionService = inject(SelectionService<AppFile>);
  readonly viewMode = inject(StateService).viewMode;
  constructor() {
    this.selectionService.init(this.fileService.userFiles);
  }
}
