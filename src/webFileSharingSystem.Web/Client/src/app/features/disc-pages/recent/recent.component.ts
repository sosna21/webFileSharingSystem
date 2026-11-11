import { Component, inject } from '@angular/core';
import { FileService } from '../../../core/services/file.service';
import { BaseDiscPageComponent } from '../base-disc-page/base-disc-page.component';
import { BaseDiscPageHeaderComponent } from '../base-disc-page/base-disc-page-header/base-disc-page-header.component';
import { UserFilesViewComponent } from '../../../shared/user-files-view/user-files-view.component';
import { SelectionService } from '../../../core/services/selection.service';
import { AppFile } from '../../../core/models/app-file.model';
import { FileActionsStripComponent } from '../home/file-actions-strip/file-actions-strip.component';
import { StateService } from '../../../core/services/state.service';

@Component({
  selector: 'app-recent',
  imports: [
    BaseDiscPageComponent,
    BaseDiscPageHeaderComponent,
    UserFilesViewComponent,
    FileActionsStripComponent,
  ],
  providers: [SelectionService<AppFile>],
  templateUrl: './recent.component.html',
  styleUrl: './recent.component.scss',
})
export class RecentComponent {
  private readonly fileService = inject(FileService);
  private readonly selectionService = inject(SelectionService<AppFile>);
  readonly viewMode = inject(StateService).viewMode;
  constructor() {
    this.selectionService.init(this.fileService.userFiles);
  }
}
