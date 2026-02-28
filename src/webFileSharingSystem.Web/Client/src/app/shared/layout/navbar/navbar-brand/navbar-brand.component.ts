import { NgClass } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, signal } from '@angular/core';

@Component({
  selector: 'app-navbar-brand',
  imports: [NgClass],
  templateUrl: './navbar-brand.component.html',
  styleUrl: './navbar-brand.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class NavbarBrandComponent {
  isHovering = signal(false);
  iconClass = computed(() => {
    return {
      'bi bi-cloud-fill': !this.isHovering(),
      'bi bi-cloud-lightning-fill': this.isHovering(),
    };
  });

}
