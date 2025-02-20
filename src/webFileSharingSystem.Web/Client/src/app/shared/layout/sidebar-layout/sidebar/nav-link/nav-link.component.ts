import { Component, input } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';

@Component({
  selector: 'li[app-nav-link]',
  imports: [RouterLink, RouterLinkActive],
  templateUrl: './nav-link.component.html',
  styleUrl: './nav-link.component.scss',
  host: {
    class: 'nav-item border-bottom border-1 rounded mb-1'
  }
})
export class NavLinkComponent {
  link = input.required<string>();
}
