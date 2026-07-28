import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { BaseDiscPageComponent } from '../base-disc-page/base-disc-page.component';
import { BaseDiscPageHeaderComponent } from '../base-disc-page/base-disc-page-header/base-disc-page-header.component';
import { FileService } from '../../../core/services/file.service';
import { AppFile } from '../../../core/models/app-file.model';
import { SelectionService } from '../../../core/services/selection.service';
import { UserFilesTableComponent } from '../../../shared/user-files-table/user-files-table.component';
import { FileActionsStripComponent } from '../home/file-actions-strip/file-actions-strip.component';
import { UserFilesGridComponent } from '../../../shared/user-files-grid/user-files-grid.component';
import { StateService } from '../../../core/services/state.service';

@Component({
  selector: 'app-shared-by-me',
  imports: [
    BaseDiscPageComponent,
    BaseDiscPageHeaderComponent,
    UserFilesTableComponent,
    FileActionsStripComponent,
    UserFilesGridComponent,
  ],
  providers: [SelectionService<AppFile>],
  templateUrl: './shared-by-me.component.html',
  styleUrl: './shared-by-me.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SharedByMeComponent {
  private readonly fileService = inject(FileService);
  private readonly selectionService = inject(SelectionService<AppFile>);
  readonly viewMode = inject(StateService).viewMode;

  constructor() {
    this.selectionService.init(this.fileService.userFiles);
  }
}
