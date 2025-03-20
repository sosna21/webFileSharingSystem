import { ChangeDetectionStrategy, Component, inject, OnInit } from '@angular/core';
import { ToastService } from '../../../core/services/toast.service';
import { MessageSeverity } from '../../../core/models/toast-info.model';

@Component({
  selector: 'app-shared-by-me',
  imports: [],
  templateUrl: './shared-by-me.component.html',
  styleUrl: './shared-by-me.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class SharedByMeComponent implements OnInit {
  private toastsService = inject(ToastService);

  ngOnInit(): void {
    this.toastsService.show('Shared by me', 'This is a toast message', MessageSeverity.success);
  }

}
