import { ChangeDetectionStrategy, Component, input } from '@angular/core';

@Component({
  selector: 'app-main-action-btn',
  imports: [],
  templateUrl: './main-action-btn.component.html',
  styleUrl: './main-action-btn.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class MainActionBtnComponent {
  loading = input.required<boolean>();
  testId = input<string | null>(null);
}
