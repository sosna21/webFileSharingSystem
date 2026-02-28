import { ChangeDetectionStrategy, Component, input } from '@angular/core';

@Component({
  selector: 'app-card-main-content',
  imports: [],
  templateUrl: './card-main-content.component.html',
  styleUrl: './card-main-content.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class CardMainContentComponent {
  errorMsg = input<string | null>(null);
}
