import { Component, computed, inject } from '@angular/core';
import { SelectionService } from '../../core/services/selection.service';

@Component({
  selector: 'app-selection-area',
  imports: [],
  templateUrl: './selection-area.component.html',
  styleUrl: './selection-area.component.scss',
})
export class SelectionAreaComponent {
  private readonly selection = inject(SelectionService);

  readonly rubberBandStyle = computed(() => {
    const bounds = this.selection.rubberBandBounds();
    const container = this.selection.getScrollContainerElement();
    const wrapper = container?.parentElement;

    if (!bounds || !container || !wrapper) return null;

    const wrapperRect = wrapper.getBoundingClientRect();
    const containerRect = container.getBoundingClientRect();
    const left =
      containerRect.left -
      wrapperRect.left +
      bounds.left -
      container.scrollLeft;
    const top =
      containerRect.top - wrapperRect.top + bounds.top - container.scrollTop;

    if (!bounds) return null;

    return {
      left: `${left}px`,
      top: `${top}px`,
      width: `${bounds.width}px`,
      height: `${bounds.height}px`,
    };
  });
  rubberBandActive() {
    return this.selection.rubberBandActive();
  }
}
