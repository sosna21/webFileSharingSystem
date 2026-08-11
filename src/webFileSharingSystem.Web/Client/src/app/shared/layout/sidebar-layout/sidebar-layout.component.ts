import { Component, inject } from '@angular/core';
import { NavbarComponent } from '../navbar/navbar.component';
import { SidebarComponent } from './sidebar/sidebar.component';
import { RouterOutlet } from '@angular/router';
import { ModalService } from '../../../core/services/modal.service';

@Component({
  selector: 'app-sidebar-layout',
  imports: [RouterOutlet, NavbarComponent, SidebarComponent],
  templateUrl: './sidebar-layout.component.html',
  styleUrl: './sidebar-layout.component.scss',
  host: {
    '(window:keydown)': 'onKeydown($event)',
  },
})
export class SidebarLayoutComponent {
  private readonly modalService = inject(ModalService);

  onKeydown(event: KeyboardEvent) {
    const target = event.target as HTMLElement;
    if (
      target.tagName === 'INPUT' ||
      target.tagName === 'TEXTAREA' ||
      target.isContentEditable
    ) {
      return;
    }

    if (event.key === '?') {
      event.preventDefault(); // Prevents typing '?' if focused on subtle focus elements
      this.modalService.keyboardShortcutsModal();
    }
  }
}
