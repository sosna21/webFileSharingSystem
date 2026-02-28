import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { NgbToastModule } from '@ng-bootstrap/ng-bootstrap';
import { ToastService } from '../../services/toast.service';
import { ToastBaseComponent } from "./toast-base/toast-base.component";

@Component({
  selector: 'app-toast',
  imports: [NgbToastModule, ToastBaseComponent],
  templateUrl: './toast.component.html',
  styleUrl: './toast.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class ToastComponent {
  private toastService = inject(ToastService);
  toasts = this.toastService.toasts$;
}
