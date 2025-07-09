import { NgClass } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, inject, OnInit, Renderer2, signal } from '@angular/core';
import { NgbDropdownModule } from '@ng-bootstrap/ng-bootstrap';
import { LocalStorageManagementService } from '../../core/services/local-storage-management.service';
@Component({
  selector: 'app-theme-switch',
  imports: [NgbDropdownModule, NgClass],
  templateUrl: './theme-switch.component.html',
  styleUrl: './theme-switch.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class ThemeSwitchComponent implements OnInit {
  private renderer2 = inject(Renderer2);
  private storage = inject(LocalStorageManagementService);

  theme = signal('auto');
  themeIcon = computed(() => ({
    'bi-circle-half': this.theme() === 'auto',
    'bi-sun-fill': this.theme() === 'light',
    'bi-moon-stars-fill': this.theme() === 'dark'
  }));
  isDefaultDark = false;


  ngOnInit(): void {
    this.isDefaultDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
    const savedTheme = this.storage.getTheme();
    this.setNewTheme(savedTheme ?? 'auto');
  }

  changeTheme(newTheme: string) {
    this.storage.saveTheme(newTheme);
    this.setNewTheme(newTheme);
  }

  private setNewTheme(theme: string) {
    this.theme.set(theme);

    if (theme === 'auto')
      theme = this.isDefaultDark ? 'dark' : 'light';
    this.renderer2.setAttribute(document.querySelector('html'), 'data-bs-theme', theme);
  }
}
