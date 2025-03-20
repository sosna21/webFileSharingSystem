import { ChangeDetectionStrategy, Component, inject, OnInit } from '@angular/core';
import { ToastService } from '../../../core/services/toast.service';
import { MessageSeverity } from '../../../core/models/toast-info.model';

@Component({
  selector: 'app-shared-with-me',
  imports: [],
  templateUrl: './shared-with-me.component.html',
  styleUrl: './shared-with-me.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class SharedWithMeComponent implements OnInit {
  toastsService = inject(ToastService);

  ngOnInit(): void {
    this.toastsService.show('Shared with me', 'This is a toast message');
  }

}
