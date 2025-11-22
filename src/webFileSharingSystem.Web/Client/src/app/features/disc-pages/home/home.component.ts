import {
  ChangeDetectionStrategy,
  Component,
  inject,
  OnInit,
  signal,
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
import { MyFilesComponent } from "../my-files/my-files.component";
import { AppFile } from '../../../core/models/app-file.model';

@Component({
  selector: 'app-home',
  imports: [
    NgbCollapseModule,
    NgbPaginationModule,
    BaseDiscPageHeaderComponent,
    BaseDiscPageComponent,
    BreadcrumbComponent,
    FileActionsStripComponent,
    MyFilesComponent,
],
  templateUrl: './home.component.html',
  styleUrl: './home.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class HomeComponent implements OnInit {
  private readonly fileService = inject(FileService);
  readonly files = this.fileService.files;

  readonly selectedRows = signal<AppFile[]>([]);

  ngOnInit(): void {
    this.fileService.mode.set('GetAll');
  }

  refetchFiles() {
    this.fileService._fileResource.reload();
  }
}
