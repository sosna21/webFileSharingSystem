import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { FileService } from '../../../../core/services/file.service';
import { FormsModule } from '@angular/forms';
import { retainLastDefined } from '../../../../core/utils/signal-utils';

@Component({
  selector: 'app-file-search',
  imports: [FormsModule],
  templateUrl: './file-search.component.html',
  styleUrl: './file-search.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    class: 'flex-grow-1',
  },
})
export class FileSearchComponent {
  private readonly fileService = inject(FileService);
  currentFolderName = retainLastDefined(this.fileService.parentName);
  searchedPhrase = this.fileService.searchedPhrase;
}
