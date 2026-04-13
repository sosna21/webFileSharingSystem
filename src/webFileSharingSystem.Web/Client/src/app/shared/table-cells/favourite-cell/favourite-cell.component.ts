import { ChangeDetectionStrategy, Component, output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AppFile } from '../../../core/models/app-file.model';
import { NgbTooltipModule } from '@ng-bootstrap/ng-bootstrap';
import { ClicableIconDirective } from '../../../core/directives/clicable-icon.directive';
import { BaseCellDirective } from '../base-cell.directive';
import { FileStatus } from '../../../core/models/base-file.model';

@Component({
  selector: 'app-favourite-cell',
  imports: [CommonModule, NgbTooltipModule, ClicableIconDirective],
  templateUrl: './favourite-cell.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class FavouriteCellComponent extends BaseCellDirective<AppFile> {
  FileStatus = FileStatus;
  changeFavourite = output<{ files: AppFile[]; isFavourite: boolean }>();

  onChangeFavourite(file: AppFile, isFavourite: boolean) {
    this.changeFavourite.emit({ files: [file], isFavourite });
  }
}
