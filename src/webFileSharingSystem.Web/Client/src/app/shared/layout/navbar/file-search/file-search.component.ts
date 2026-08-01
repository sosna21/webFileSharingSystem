import {
  Component,
  ElementRef,
  inject,
  viewChild,
} from '@angular/core';
import { FileService } from '../../../../core/services/file.service';
import { FormsModule } from '@angular/forms';
import { retainLastDefined } from '../../../../core/utils/signal-utils';

@Component({
  selector: 'app-file-search',
  imports: [FormsModule],
  templateUrl: './file-search.component.html',
  styleUrl: './file-search.component.scss',
  host: {
    class: 'flex-grow-1',
    '(window:keydown)': 'onKeydown($event)',
  },
})
export class FileSearchComponent {
  private readonly fileService = inject(FileService);
  private readonly searchInput =
    viewChild<ElementRef<HTMLInputElement>>('searchInput');

  currentFolderName = retainLastDefined(this.fileService.parentName);
  searchedPhrase = this.fileService.searchedPhrase;

  setSearchPhrase(phrase: string) {
    this.fileService.setSearchPhrase(phrase);
  }

  onKeydown(event: KeyboardEvent) {
    if (event.key === 'F3') {
      event.preventDefault();
      this.searchInput()?.nativeElement.focus();
    }
  }
}
