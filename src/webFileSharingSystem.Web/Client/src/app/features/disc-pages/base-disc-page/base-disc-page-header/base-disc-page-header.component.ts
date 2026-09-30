import { Component, computed, inject } from '@angular/core';
import { FileSearchComponent } from '../../../../shared/layout/navbar/file-search/file-search.component';
import { ViewToogleComponent } from '../../../../shared/view-toogle/view-toogle.component';
import { StateService } from '../../../../core/services/state.service';
import { SelectionService } from '../../../../core/services/selection.service';
import { NgTemplateOutlet } from '@angular/common';

@Component({
  selector: 'app-base-disc-page-header',
  imports: [FileSearchComponent, ViewToogleComponent, NgTemplateOutlet],
  templateUrl: './base-disc-page-header.component.html',
  styleUrl: './base-disc-page-header.component.scss',
})
export class BaseDiscPageHeaderComponent {
  private readonly stateService = inject(StateService);
  private readonly selection = inject(SelectionService);

  readonly viewMode = this.stateService.viewMode;
  readonly isTouchMultiSelectionActive =
    this.selection.isTouchMultiSelectionActive;
  readonly selectedCount = computed(
    () => this.selection.selectedItems().length,
  );

  clearSelection() {
    this.selection.clear();
  }
}
