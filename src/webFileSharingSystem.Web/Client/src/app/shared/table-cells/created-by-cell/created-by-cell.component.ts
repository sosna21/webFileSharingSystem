import { Component, computed, effect, inject, input } from '@angular/core';
import { BaseFile } from '../../../core/models/base-file.model';
import { BaseCellDirective } from '../base-cell.directive';
import { AuthenticationService } from '../../../core/services/authentication.service';
import { UserPhotoService } from '../../../core/services/user-photo.service';
import { TooltipOnOverflowDirective } from '../../../core/directives/tooltip-on-overflow.directive';

@Component({
  selector: 'app-created-by-cell',
  imports: [TooltipOnOverflowDirective],
  templateUrl: './created-by-cell.component.html',
  styleUrl: './created-by-cell.component.scss',
  host: {
    class: 'd-flex align-items-center',
  },
})
export class CreatedByCellComponent<
  T extends BaseFile,
> extends BaseCellDirective<T> {
  private readonly authService = inject(AuthenticationService);
  private readonly userPhotoService = inject(UserPhotoService);
  readonly currentUserId = computed(() => this.authService.currentUser()?.id);
  readonly userPhotoUrl = computed(() =>
    this.userPhotoService.getPhotoUrl(this.file().createdByPhotoUrl),
  );
  readonly currentUserLabel = $localize`You`;
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
      const createdByPhotoUrl = this.file().createdByPhotoUrl;
      if (!createdByPhotoUrl) {
        return;
      }

      const sub = this.userPhotoService
        .ensurePhotoLoaded(createdByPhotoUrl)
        .subscribe();
      onCleanup(() => sub.unsubscribe());
    });
  }
}
