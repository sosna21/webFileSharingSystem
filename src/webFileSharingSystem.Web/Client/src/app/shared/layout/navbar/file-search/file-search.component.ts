import { ChangeDetectionStrategy, Component } from '@angular/core';

@Component({
  selector: 'app-file-search',
  imports: [],
  templateUrl: './file-search.component.html',
  styleUrl: './file-search.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    class: 'flex-grow-1'
  }
})
export class FileSearchComponent {

}
