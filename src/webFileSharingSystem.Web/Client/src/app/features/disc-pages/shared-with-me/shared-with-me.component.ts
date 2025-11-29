import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { BaseDiscPageComponent } from '../base-disc-page/base-disc-page.component';
import { BaseDiscPageHeaderComponent } from '../base-disc-page/base-disc-page-header/base-disc-page-header.component';
import { SelectionService } from '../../../core/services/selection.service';
import { AppFile } from '../../../core/models/app-file.model';
import { SharedFilesTableComponent } from '../../../shared/shared-files-table/shared-files-table.component';
import { SharedFilesService } from '../../../core/services/shared-files.service';
import { SharesBreadcrumbComponent } from './shares-breadcrumb/shares-breadcrumb.component';
import { FileActionsStripComponent } from '../home/file-actions-strip/file-actions-strip.component';

@Component({
  selector: 'app-shared-with-me',
  imports: [
    BaseDiscPageComponent,
    BaseDiscPageHeaderComponent,
    SharedFilesTableComponent,
    SharesBreadcrumbComponent,
    FileActionsStripComponent,
  ],
  providers: [SelectionService<AppFile>],
  templateUrl: './shared-with-me.component.html',
  styleUrl: './shared-with-me.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SharedWithMeComponent {
  private readonly sharedFilesService = inject(SharedFilesService);
  private readonly selectionService = inject(SelectionService<AppFile>);

  constructor() {
    this.selectionService.init(this.sharedFilesService.files);
  }
}
