import { Component, inject, input } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { FileService } from '../../../../../core/services/file.service';
import { SharedFilesService } from '../../../../../core/services/shared-files.service';

@Component({
  selector: 'li[app-nav-link]',
  imports: [RouterLink, RouterLinkActive],
  templateUrl: './nav-link.component.html',
  styleUrl: './nav-link.component.scss',
  host: {
    class:
      'nav-item border-bottom border-2 border-secondary-subtle rounded mb-1',
  },
})
export class NavLinkComponent {
  private readonly fileService = inject(FileService);
  private readonly sharedFilesService = inject(SharedFilesService);
  link = input.required<string>();

  resetFileServices() {
    this.fileService.parentId.set(null);
    this.fileService.searchedPhrase.set('');
    this.sharedFilesService.parentId.set(null);
    this.sharedFilesService.searchedPhrase.set('');
  }
}
