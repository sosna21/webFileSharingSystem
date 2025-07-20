import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { FileService } from '../../../../core/services/file.service';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-file-search',
  imports: [FormsModule],
  templateUrl: './file-search.component.html',
  styleUrl: './file-search.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    class: 'flex-grow-1'
  }
})
export class FileSearchComponent {
  private readonly fileService = inject(FileService);
  searchedPhrase = this.fileService.searchedPhrase;

}
