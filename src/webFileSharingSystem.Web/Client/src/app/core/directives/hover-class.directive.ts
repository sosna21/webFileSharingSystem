import { Directive, Input, computed, effect, input, signal } from '@angular/core';

@Directive({
  selector: '[appHoverClass]',
  host: {
    '[class]': 'classMap()',
    '(mouseenter)': 'hover.set(true)',
    '(mouseleave)': 'hover.set(false)'
  }
})
export class HoverClassDirective {
  private hover = signal(false);
  readonly appHoverClass = input.required<string>();


  readonly classMap = computed(() => this.hover() ? this.appHoverClass() : '');
}
