import {
  ChangeDetectionStrategy,
  Component,
  inject,
  OnInit,
} from '@angular/core';
import {
  NgbCollapseModule,
  NgbPaginationModule,
} from '@ng-bootstrap/ng-bootstrap';
import { FileService } from '../../../core/services/file.service';
import { BaseDiscPageHeaderComponent } from '../base-disc-page/base-disc-page-header/base-disc-page-header.component';
import { BaseDiscPageComponent } from '../base-disc-page/base-disc-page.component';
import { BreadcrumbComponent } from './breadcrumb/breadcrumb.component';
import { FileActionsStripComponent } from './file-actions-strip/file-actions-strip.component';
import { AppFile } from '../../../core/models/app-file.model';
import { SelectionService } from '../../../core/services/selection.service';
import { UserFilesTableComponent } from '../../../shared/user-files-table/user-files-table.component';

@Component({
  selector: 'app-home',
  imports: [
    NgbCollapseModule,
    NgbPaginationModule,
    BaseDiscPageHeaderComponent,
    BaseDiscPageComponent,
    BreadcrumbComponent,
    FileActionsStripComponent,
    UserFilesTableComponent
  ],
  providers: [SelectionService<AppFile>],
  templateUrl: './home.component.html',
  styleUrl: './home.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class HomeComponent implements OnInit {
  private readonly fileService = inject(FileService);
  private readonly selectionService = inject(SelectionService<AppFile>);

  constructor() {
    this.selectionService.init(this.fileService.files);
  }

  ngOnInit(): void {
    this.fileService.mode.set('GetAll');
  }

  refetchFiles() {
    this.fileService._fileResource.reload();
  }
}
