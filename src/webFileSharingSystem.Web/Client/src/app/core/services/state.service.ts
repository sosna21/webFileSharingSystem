import {
  effect,
  inject,
  Injectable,
  Renderer2,
  RendererFactory2,
  signal,
} from '@angular/core';
import { LocalStorageManagementService } from './local-storage-management.service';

export type ThemeMode = 'light' | 'dark' | 'auto';
export type ViewMode = 'list' | 'grid';

@Injectable({
  providedIn: 'root',
})
export class StateService {
  private storage = inject(LocalStorageManagementService);
  private renderer: Renderer2;

  private _selectedTheme = signal<ThemeMode>(this.storage.getTheme() ?? 'auto');
  private readonly isDefaultDark = window.matchMedia(
    '(prefers-color-scheme: dark)',
  ).matches;

  readonly selectedTheme = this._selectedTheme.asReadonly();
  readonly viewMode = signal<ViewMode>(this.storage.getViewMode() ?? 'list');

  constructor(rendererFactory: RendererFactory2) {
    this.renderer = rendererFactory.createRenderer(null, null);
    this.setNewTheme(this._selectedTheme());

    effect(() => {
      const viewMode = this.viewMode();
      this.storage.saveViewMode(viewMode);
    });
  }

  changeTheme(newTheme: ThemeMode) {
    this.storage.saveTheme(newTheme);
    this.setNewTheme(newTheme);
  }

  private setNewTheme(theme: ThemeMode) {
    this._selectedTheme.set(theme);

    if (theme === 'auto') theme = this.isDefaultDark ? 'dark' : 'light';
    this.renderer.setAttribute(
      document.querySelector('html'),
      'data-bs-theme',
      theme,
    );
  }
}
