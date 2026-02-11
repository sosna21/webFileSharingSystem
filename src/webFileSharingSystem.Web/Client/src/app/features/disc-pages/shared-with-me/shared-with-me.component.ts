import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { BaseDiscPageComponent } from '../base-disc-page/base-disc-page.component';
import { BaseDiscPageHeaderComponent } from '../base-disc-page/base-disc-page-header/base-disc-page-header.component';
import { SelectionService } from '../../../core/services/selection.service';
import { SharedFilesTableComponent } from '../../../shared/shared-files-table/shared-files-table.component';
import { FileActionsStripComponent } from '../home/file-actions-strip/file-actions-strip.component';
import { FileService } from '../../../core/services/file.service';
import { SharedFile } from '../../../core/models/shared-file.model';
import { BreadcrumbComponent } from '../../../shared/breadcrumb/breadcrumb.component';

@Component({
  selector: 'app-shared-with-me',
  imports: [
    BaseDiscPageComponent,
    BaseDiscPageHeaderComponent,
    SharedFilesTableComponent,
    FileActionsStripComponent,
    BreadcrumbComponent,
  ],
  providers: [SelectionService<SharedFile>],
  templateUrl: './shared-with-me.component.html',
  styleUrl: './shared-with-me.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SharedWithMeComponent {
  private readonly fileService = inject(FileService);
  private readonly selectionService = inject(SelectionService<SharedFile>);

  constructor() {
    this.selectionService.init(this.fileService.sharedFiles);
  }
}
