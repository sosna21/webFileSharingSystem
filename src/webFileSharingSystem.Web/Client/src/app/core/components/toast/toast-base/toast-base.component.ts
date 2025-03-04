import { ChangeDetectionStrategy, Component, inject, input } from '@angular/core';
import { NgbToastModule } from '@ng-bootstrap/ng-bootstrap';
import { ToastInfo } from '../../../models/toast-info.model';
import { ToastService } from '../../../services/toast.service';

@Component({
  selector: 'app-toast-base',
  imports: [NgbToastModule],
  templateUrl: './toast-base.component.html',
  styleUrl: './toast-base.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class ToastBaseComponent {
  private toastService = inject(ToastService);
  toast = input.required<ToastInfo>();
  styling = input('');

  onClick() {
    navigator.clipboard.writeText(this.toast().body);
  }

  onHide() {
    this.toastService.remove(this.toast());
  }
}
