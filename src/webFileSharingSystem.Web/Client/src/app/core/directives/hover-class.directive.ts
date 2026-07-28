import { Directive, computed, input, signal } from '@angular/core';

@Directive({
  selector: '[appHoverClass]',
  host: {
    '[class]': 'classMap()',
    '(mouseenter)': 'hover.set(true)',
    '(mouseleave)': 'hover.set(false)',
  },
})
export class HoverClassDirective {
  readonly hover = signal(false);
  readonly appHoverClass = input<string>('bg-secondary');

  readonly classMap = computed(() =>
    this.hover() ? this.appHoverClass() : '',
  );
}
