import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  inject,
} from '@angular/core';
import { BaseFile } from '../../../core/models/base-file.model';
import { BaseCellDirective } from '../base-cell.directive';
import { AuthenticationService } from '../../../core/services/authentication.service';
import { UserPhotoService } from '../../../core/services/user-photo.service';

@Component({
  selector: 'app-created-by-cell',
  imports: [],
  templateUrl: './created-by-cell.component.html',
  styleUrl: './created-by-cell.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    class: 'text-nowrap',
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
