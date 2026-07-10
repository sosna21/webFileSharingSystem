import {
  ChangeDetectionStrategy,
  Component,
  input,
  output,
} from '@angular/core';
import { StorageQuotaComponent } from '../../../shared/storage-quota/storage-quota.component';
import { AppUserResponse } from '../../../core/models/app-user-response.model';

@Component({
  selector: 'app-profile-view',
  imports: [StorageQuotaComponent],
  templateUrl: './profile-view.component.html',
  styleUrl: './profile-view.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    'data-testid': 'profile-view',
  },
})
export class ProfileViewComponent {
  readonly profile = input<AppUserResponse | null>(null);
  readonly displayedPhotoUrl = input<string | null>(null);
  readonly deletePhoto = output();
}
