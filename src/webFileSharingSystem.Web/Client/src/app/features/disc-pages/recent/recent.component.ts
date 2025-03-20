import { ChangeDetectionStrategy, Component, inject, OnInit } from '@angular/core';
import { ToastService } from '../../../core/services/toast.service';
import { MessageSeverity } from '../../../core/models/toast-info.model';

@Component({
  selector: 'app-recent',
  imports: [],
  templateUrl: './recent.component.html',
  styleUrl: './recent.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class RecentComponent implements OnInit {
  private toastsService = inject(ToastService);

  ngOnInit(): void {
    this.toastsService.show('Recent', 'This is a toast message', MessageSeverity.info);
  }

}
