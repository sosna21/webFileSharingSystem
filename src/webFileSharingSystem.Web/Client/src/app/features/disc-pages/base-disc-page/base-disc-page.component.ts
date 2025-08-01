import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { NgbDropdownModule, NgbPaginationModule, NgbTooltipModule } from "@ng-bootstrap/ng-bootstrap";
import { FileService } from '../../../core/services/file.service';
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { BaseTableComponent } from "../base-table/base-table.component";

@Component({
  selector: 'app-base-disc-page',
  imports: [NgbPaginationModule, FormsModule, CommonModule, NgbTooltipModule, NgbDropdownModule, BaseTableComponent],
  templateUrl: './base-disc-page.component.html',
  styleUrl: './base-disc-page.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class BaseDiscPageComponent {
  private readonly fileService = inject(FileService);
  readonly showPagination = computed(() => this.totalItems() > this.itemsPerPage());

  itemsPerPage = this.fileService.itemsPerPage;
  currentPage = this.fileService.currentPage;
  totalItems = computed(() => this.fileService.fileResponseResource()?.totalCount || 0);

  fileResource = this.fileService.fileResource;
  fileResponseResponse = this.fileService.fileResponseResource;
  
  loadingData = computed(() => this.fileResource.isLoading());
}
