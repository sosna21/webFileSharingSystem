import { Component, input, output } from '@angular/core';

@Component({
  selector: 'app-view-toogle-btn',
  imports: [],
  templateUrl: './view-toogle-btn.component.html',
  styleUrl: './view-toogle-btn.component.scss',
  host: {
    class: 'btn',
    '[class.btn-outline-secondary]': '!active()',
    '[class.active]': 'active()',
    '[class.btn-primary]': 'active()',
    '(click)': 'pressed.emit()',
  },
})
export class ViewToogleBtnComponent {
  readonly active = input.required<boolean>();
  readonly pressed = output<void>();
}
