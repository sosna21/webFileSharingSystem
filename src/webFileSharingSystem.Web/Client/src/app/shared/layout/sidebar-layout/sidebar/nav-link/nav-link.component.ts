import { Component, inject, input } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { FileService } from '../../../../../core/services/file.service';

@Component({
  selector: 'li[app-nav-link]',
  imports: [RouterLink, RouterLinkActive],
  templateUrl: './nav-link.component.html',
  styleUrl: './nav-link.component.scss',
  host: {
    class:
      'nav-item border-bottom border-2 border-secondary-subtle rounded mb-1 user-select-none',
  },
})
export class NavLinkComponent {
  link = input.required<string>();
}
