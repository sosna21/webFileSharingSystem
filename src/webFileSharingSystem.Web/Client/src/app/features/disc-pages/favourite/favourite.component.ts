import {
  ChangeDetectionStrategy,
  Component,
  inject,
  OnInit,
} from '@angular/core';
import { BaseDiscPageComponent } from '../base-disc-page/base-disc-page.component';
import { BaseDiscPageHeaderComponent } from '../base-disc-page/base-disc-page-header/base-disc-page-header.component';
import { FileService } from '../../../core/services/file.service';
import { AppFile } from '../../../core/models/app-file.model';
import { SelectionService } from '../../../core/services/selection.service';
import { UserFilesTableComponent } from "../../../shared/user-files-table/user-files-table.component";

@Component({
  selector: 'app-favourite',
  imports: [BaseDiscPageComponent, BaseDiscPageHeaderComponent, UserFilesTableComponent],
  providers: [SelectionService<AppFile>],
  templateUrl: './favourite.component.html',
  styleUrl: './favourite.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class FavouriteComponent implements OnInit {
  private readonly fileService = inject(FileService);
  private readonly selectionService = inject(SelectionService<AppFile>);

  constructor() {
    this.selectionService.init(this.fileService.files);
  }

  ngOnInit(): void {
    this.fileService.mode.set('GetFavourites');
  }
}
