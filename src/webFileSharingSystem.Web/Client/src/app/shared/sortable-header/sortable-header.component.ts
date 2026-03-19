import { ChangeDetectionStrategy, Component, input } from '@angular/core';

@Component({
  selector: 'app-sortable-header',
  imports: [],
  templateUrl: './sortable-header.component.html',
  styleUrl: './sortable-header.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    class: 'd-flex text-nowrap gap-1',
    style: 'cursor: pointer;',
  },
})
export class SortableHeaderComponent {
  column = input.required<string>();
  sortOption = input.required<{
    column: string;
    direction: 'asc' | 'desc';
  } | null>();
}
