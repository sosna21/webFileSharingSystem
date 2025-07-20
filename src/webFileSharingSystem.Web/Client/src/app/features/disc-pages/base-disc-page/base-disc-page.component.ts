import { Component, computed, inject, input, OnInit } from '@angular/core';
import { NgbPaginationModule } from "@ng-bootstrap/ng-bootstrap";
import { FileService } from '../../../core/services/file.service';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';

@Component({
  selector: 'app-base-disc-page',
  imports: [NgbPaginationModule, FormsModule],
  templateUrl: './base-disc-page.component.html',
  styleUrl: './base-disc-page.component.scss'
})
export class BaseDiscPageComponent {
  private readonly fileService = inject(FileService);
  readonly showPagination = computed(() => this.totalItems() > this.itemsPerPage());
  readonly router = inject(Router);

  itemsPerPage = this.fileService.itemsPerPage;
  currentPage = this.fileService.currentPage;
  totalItems = computed(() => this.fileService.fileResponseResource()?.totalCount || 0);

  fileResource = this.fileService.fileResource;
  fileResponseResponse = this.fileService.fileResponseResource;

  files = computed(() => this.fileResponseResponse()?.items || []);
  loadingData = computed(() => this.fileResource.isLoading());

  selectFolder(folderId: number) {
    this.fileService.goToFolder(folderId);
  }
}
