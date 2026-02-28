import { Component, input } from '@angular/core';
import { ShareAccessMode } from '../../core/models/share-access-mode.model';

@Component({
  selector: 'app-access-mode-icon',
  imports: [],
  templateUrl: './access-mode-icon.component.html',
  styleUrl: './access-mode-icon.component.scss',
})
export class AccessModeIconComponent {
  readonly ShareAccessMode = ShareAccessMode;
  readonly accessMode = input.required<ShareAccessMode>();
  readonly withColor = input<boolean>(false);
}
