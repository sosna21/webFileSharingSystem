import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  inject,
  input,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { SharedFile } from '../../../core/models/shared-file.model';
import { BaseCellDirective } from '../base-cell.directive';
import { AuthenticationService } from '../../../core/services/authentication.service';
import { UserPhotoService } from '../../../core/services/user-photo.service';
import { TooltipOnOverflowDirective } from '../../../core/directives/tooltip-on-overflow.directive';

@Component({
  selector: 'app-shared-user-name-cell',
  imports: [CommonModule, TooltipOnOverflowDirective],
  templateUrl: './shared-user-name-cell.component.html',
  styleUrl: './shared-user-name-cell.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    class: 'd-flex align-items-center',
  },
})
export class SharedUserNameCellComponent extends BaseCellDirective<SharedFile> {
  private readonly authService = inject(AuthenticationService);
  private readonly userPhotoService = inject(UserPhotoService);

  readonly currentUserId = computed(() => this.authService.currentUser()?.id);
  readonly sharedUserPhotoKey = computed(
    () => this.file().sharedUserPhotoUrl ?? null,
  );
  readonly userPhotoUrl = computed(() =>
    this.userPhotoService.getPhotoUrl(this.sharedUserPhotoKey()),
  );
  readonly alignTextBottom = input<boolean>(false);
  readonly photoTextGap = input<'lg' | 'md' | 'sm'>('md');
  readonly photoTextGapClass = computed(() => {
    switch (this.photoTextGap()) {
      case 'lg':
        return 'me-3';
      case 'md':
        return 'me-2';
      case 'sm':
        return 'me-1';
    }
  });

  constructor() {
    super();

    effect((onCleanup) => {
      const sharedUserPhotoKey = this.sharedUserPhotoKey();
      if (!sharedUserPhotoKey) {
        return;
      }

      const sub = this.userPhotoService
        .ensurePhotoLoaded(sharedUserPhotoKey)
        .subscribe();
      onCleanup(() => sub.unsubscribe());
    });
  }
}
