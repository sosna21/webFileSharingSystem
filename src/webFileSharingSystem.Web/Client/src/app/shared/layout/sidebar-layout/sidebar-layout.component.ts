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
    '(window:keyup)': 'onKeyup($event)',
    '(window:mousedown)': 'onMousedown()',
  },
})
export class SidebarLayoutComponent {
  private readonly modalService = inject(ModalService);
  private ctrlPressedAlone = false;
  private ctrlPressStartTime = 0;

  onKeydown(event: KeyboardEvent) {
    if (event.key === 'Control') {
      if (!event.repeat) {
        this.ctrlPressedAlone = true;
        this.ctrlPressStartTime = Date.now();
      }
    } else {
      // If any other key is pressed alongside Ctrl, it's a combination shortcut
      this.ctrlPressedAlone = false;
    }
  }

  onKeyup(event: KeyboardEvent) {
    if (event.key === 'Control' && this.ctrlPressedAlone) {
      this.ctrlPressedAlone = false;
      if (Date.now() - this.ctrlPressStartTime <= 1000) {
        this.modalService.keyboardShortcutsModal();
      }
    }
  }

  onMousedown() {
    // If user clicks while holding Ctrl (e.g. for selection), cancel the shortcuts modal
    this.ctrlPressedAlone = false;
  }
}
