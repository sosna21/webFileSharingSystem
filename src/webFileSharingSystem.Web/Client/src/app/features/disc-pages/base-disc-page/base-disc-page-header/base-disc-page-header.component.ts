import { Component, computed, inject, output } from '@angular/core';
import { FileSearchComponent } from '../../../../shared/layout/navbar/file-search/file-search.component';
import { ViewToogleComponent } from '../../../../shared/view-toogle/view-toogle.component';
import { StateService } from '../../../../core/services/state.service';
import { SelectionService } from '../../../../core/services/selection.service';
import { NgTemplateOutlet } from '@angular/common';
import { ClicableIconDirective } from '../../../../core/directives/clicable-icon.directive';

@Component({
  selector: 'app-base-disc-page-header',
  imports: [FileSearchComponent, ViewToogleComponent, NgTemplateOutlet, ClicableIconDirective],
  templateUrl: './base-disc-page-header.component.html',
  styleUrl: './base-disc-page-header.component.scss',
  host: {
    class: 'mt-1 mt-sm-0'
  }
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
  readonly allFilesSelected = this.selection.areAllChecked;
  readonly tableMenuRequested = output<void>();
  readonly fileMenuRequested = output<void>();

  clearSelection() {
    this.selection.clear();
  }

  toggleAllFiles() {
    this.selection.toggleAll(!this.allFilesSelected());
  }
}
