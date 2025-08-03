import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { FileService } from '../../../../core/services/file.service';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'app-breadcrumb',
  imports: [RouterLink],
  templateUrl: './breadcrumb.component.html',
  styleUrl: './breadcrumb.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    class: 'd-flex justify-content-between align-items-center p-2 border border-2 rounded-4 mb-3'
  }
})
export class BreadcrumbComponent {
  private readonly fileService = inject(FileService);
  readonly breadCrumbsResource = this.fileService.breadCrumbsResource;
  readonly breadCrumbs = this.breadCrumbsResource.value;

  selectFolder(folderId: number | null) {
    this.fileService.goToFolder(folderId);
  }
}
