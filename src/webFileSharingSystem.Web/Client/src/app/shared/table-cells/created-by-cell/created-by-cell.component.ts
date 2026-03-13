import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
} from '@angular/core';
import { BaseFile } from '../../../core/models/base-file.model';
import { BaseCellDirective } from '../base-cell.directive';
import { AuthenticationService } from '../../../core/services/authentication.service';

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
export class CreatedByCellComponentt<
  T extends BaseFile,
> extends BaseCellDirective<T> {
  private readonly authService = inject(AuthenticationService);
  readonly currentUserId = computed(() => this.authService.currentUser()?.id);
}
