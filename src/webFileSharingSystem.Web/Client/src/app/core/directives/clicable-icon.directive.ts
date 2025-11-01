import { Directive, computed, input, signal } from '@angular/core';

@Directive({
  selector: 'i[appClicableIcon]',
  standalone: true,
  host: {
    '[style.cursor]': `disabled() ? '' : 'pointer'`,
    '[style.display]': `'inline-block'`,
    '[style.textAlign]': `'center'`,
    '[style.borderRadius]': `'50%'`,
    '[style.verticalAlign]': `'middle'`,
    '[style.lineHeight]': 'bgSize()',
    '[style.width]': 'bgSize()',
    '[style.height]': 'bgSize()',
    '[class]': 'hoveredClass()',
    '(mouseenter)': 'isHovered.set(true)',
    '(mouseleave)': 'isHovered.set(false)',
  }
})
export class ClicableIconDirective {
  readonly bgSize = input<string>('2rem');
  readonly bgClass = input<string>('bg-secondary-subtle');
  readonly isHovered = signal(false);
  readonly disabled = input<boolean>(false);

  readonly hoveredClass = computed(() => this.isHovered() && !this.disabled() ? this.bgClass() : this.disabled() ? 'opacity-50  ' : '');
}
