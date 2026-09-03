import { Component, computed, inject, signal } from '@angular/core';
import { NgbDropdownModule } from '@ng-bootstrap/ng-bootstrap';
import { HoverClassDirective } from '../../core/directives/hover-class.directive';
import { Router } from '@angular/router';

type Language = 'en' | 'pl';

@Component({
  selector: 'app-language-switch',
  imports: [NgbDropdownModule, HoverClassDirective],
  templateUrl: './language-switch.component.html',
  styleUrl: './language-switch.component.scss',
})
export class LanguageSwitchComponent {
  readonly currentLanguage: Language = document.documentElement.lang.startsWith(
    'pl',
  )
    ? 'pl'
    : 'en';

  changeLanguage(language: Language): void {
    if (language === this.currentLanguage) {
      return;
    }

    const currentUrl =
      window.location.pathname + window.location.search + window.location.hash;

    const targetUrl =
      language === 'pl'
        ? `/pl${currentUrl}`
        : currentUrl.replace(/^\/pl(?=\/|$)/, '') || '/';

    document.cookie =
      language === 'pl'
        ? 'Language=pl; path=/; max-age=31536000; SameSite=Lax'
        : 'Language=en; path=/; max-age=31536000; SameSite=Lax';

    window.location.href = targetUrl;
  }
}
