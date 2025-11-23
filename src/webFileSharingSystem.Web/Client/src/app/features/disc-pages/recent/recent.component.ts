import {
  ChangeDetectionStrategy,
  Component,
  inject,
  OnInit,
} from '@angular/core';
import { FileService } from '../../../core/services/file.service';
import { BaseDiscPageComponent } from '../base-disc-page/base-disc-page.component';
import { BaseDiscPageHeaderComponent } from '../base-disc-page/base-disc-page-header/base-disc-page-header.component';
import { UserFilesTableComponent } from '../../../shared/user-files-table/user-files-table.component';
import { SelectionService } from '../../../core/services/selection.service';
import { AppFile } from '../../../core/models/app-file.model';

@Component({
  selector: 'app-recent',
  imports: [BaseDiscPageComponent, BaseDiscPageHeaderComponent, UserFilesTableComponent],
  providers: [SelectionService<AppFile>],
  templateUrl: './recent.component.html',
  styleUrl: './recent.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class RecentComponent implements OnInit {
  private readonly fileService = inject(FileService);
  private readonly selectionService = inject(SelectionService<AppFile>);

  constructor() {
    this.selectionService.init(this.fileService.files);
  }

  ngOnInit(): void {
    this.fileService.mode.set('GetRecent');
  }
}
