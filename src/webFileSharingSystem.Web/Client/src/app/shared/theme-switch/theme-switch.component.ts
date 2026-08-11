import { NgClass } from '@angular/common';
import { Component, computed, inject } from '@angular/core';
import { NgbDropdownModule } from '@ng-bootstrap/ng-bootstrap';
import { HoverClassDirective } from '../../core/directives/hover-class.directive';
import { StateService, ThemeMode } from '../../core/services/state.service';

@Component({
  selector: 'app-theme-switch',
  imports: [NgbDropdownModule, NgClass, HoverClassDirective],
  templateUrl: './theme-switch.component.html',
  styleUrl: './theme-switch.component.scss',
})
export class ThemeSwitchComponent {
  private readonly stateService = inject(StateService);

  readonly theme = this.stateService.selectedTheme;
  readonly themeIcon = computed(() => ({
    'bi-circle-half': this.theme() === 'auto',
    'bi-sun-fill': this.theme() === 'light',
    'bi-moon-stars-fill': this.theme() === 'dark',
  }));

  changeTheme(newTheme: ThemeMode) {
    this.stateService.changeTheme(newTheme);
  }
}
