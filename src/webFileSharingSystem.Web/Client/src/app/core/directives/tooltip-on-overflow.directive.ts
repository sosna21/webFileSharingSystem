import { Directive, ElementRef, inject, input } from '@angular/core';
import { NgbTooltip } from '@ng-bootstrap/ng-bootstrap';

@Directive({
  selector: '[appTooltipOnOverflow]',
  hostDirectives: [
    { directive: NgbTooltip, inputs: ['ngbTooltip: appTooltipOnOverflow'] },
  ],
  host: {
    '(mouseenter)': 'onMouseEnter()',
  },
})
export class TooltipOnOverflowDirective {
  private readonly elementRef = inject(ElementRef<HTMLElement>);
  private readonly tooltip = inject(NgbTooltip);

  appTooltipOnOverflow = input<string>('');

  constructor() {
    this.tooltip.container = 'body';
    this.tooltip.openDelay = 250;
    this.tooltip.tooltipClass = 'tooltip-max-width';
  }

  onMouseEnter() {
    const el = this.elementRef.nativeElement;
    // Check if the element's content overflows its visible area
    if (el.offsetWidth < el.scrollWidth || el.offsetHeight < el.scrollHeight) {
      this.tooltip.disableTooltip = false;
    } else {
      this.tooltip.disableTooltip = true;
    }
  }
}
