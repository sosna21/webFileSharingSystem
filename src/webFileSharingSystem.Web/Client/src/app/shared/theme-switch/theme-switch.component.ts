import { NgClass } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, inject, OnInit, Renderer2, signal } from '@angular/core';
import { NgbDropdownModule } from '@ng-bootstrap/ng-bootstrap';
@Component({
  selector: 'app-theme-switch',
  imports: [NgbDropdownModule, NgClass],
  templateUrl: './theme-switch.component.html',
  styleUrl: './theme-switch.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class ThemeSwitchComponent implements OnInit {
  renderer2 = inject(Renderer2);
  theme = signal('auto');
  themeIcon = computed(() => {
    return {
      'bi-circle-half': this.theme() === 'auto',
      'bi-sun-fill': this.theme() === 'light',
      'bi-moon-stars-fill': this.theme() === 'dark'
    };
  });
  isDefaultDark = false;


  ngOnInit(): void {
    this.isDefaultDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
    this.changeTheme(this.theme());
    //TODO load selected option from local storage if exist and prefered it over user browser theme
  }

  changeTheme(theme: string) {
    this.theme.set(theme);
    if (theme === 'auto')
      theme = this.isDefaultDark ? 'dark' : 'light';
    this.renderer2.setAttribute(document.querySelector('html'), 'data-bs-theme', theme);
    //TODO save selected option to local storage
  }

}
