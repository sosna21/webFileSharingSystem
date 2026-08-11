import { Component, input } from '@angular/core';

@Component({
  selector: 'app-card-main-content',
  imports: [],
  templateUrl: './card-main-content.component.html',
  styleUrl: './card-main-content.component.scss',
})
export class CardMainContentComponent {
  errorMsg = input<string | null>(null);
}
