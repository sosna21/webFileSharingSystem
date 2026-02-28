import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import {Location} from '@angular/common';

@Component({
  selector: 'app-settings',
  imports: [],
  templateUrl: './settings.component.html',
  styleUrl: './settings.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class SettingsComponent {
 private location = inject(Location);

  backClicked() {
    this.location.back();
  }
}
