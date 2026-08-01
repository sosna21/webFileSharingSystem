import { Component, inject } from '@angular/core';
import { FileSearchComponent } from '../../../../shared/layout/navbar/file-search/file-search.component';
import { ViewToogleComponent } from '../../../../shared/view-toogle/view-toogle.component';
import { StateService } from '../../../../core/services/state.service';

@Component({
  selector: 'app-base-disc-page-header',
  imports: [FileSearchComponent, ViewToogleComponent],
  templateUrl: './base-disc-page-header.component.html',
  styleUrl: './base-disc-page-header.component.scss',
})
export class BaseDiscPageHeaderComponent {
  private readonly stateService = inject(StateService);
  readonly viewMode = this.stateService.viewMode;
}
