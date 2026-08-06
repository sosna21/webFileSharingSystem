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
    if (!bounds) return null;

    return {
      left: `${bounds.left}px`,
      top: `${bounds.top}px`,
      width: `${bounds.width}px`,
      height: `${bounds.height}px`,
    };
  });
  rubberBandActive() {
    return this.selection.rubberBandActive();
  }
}
