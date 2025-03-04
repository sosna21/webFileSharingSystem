import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { Location } from '@angular/common';

@Component({
  selector: 'app-profile',
  imports: [],
  templateUrl: './profile.component.html',
  styleUrl: './profile.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class ProfileComponent {
  private location = inject(Location);

  backClicked() {
    this.location.back();
  }
}
