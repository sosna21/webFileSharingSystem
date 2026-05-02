import { ChangeDetectionStrategy, Component } from '@angular/core';
import { FileSearchComponent } from '../../../../shared/layout/navbar/file-search/file-search.component';

@Component({
  selector: 'app-base-disc-page-header',
  imports: [FileSearchComponent],
  templateUrl: './base-disc-page-header.component.html',
  styleUrl: './base-disc-page-header.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class BaseDiscPageHeaderComponent {}
