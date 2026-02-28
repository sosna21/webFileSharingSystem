import { Component, computed, inject, signal } from '@angular/core';
import { AuthenticationService } from '../../../../../core/services/authentication.service';
import { FileSizePipe } from '../../../../../core/pipes/file-size.pipe';
import { NgbProgressbarModule } from '@ng-bootstrap/ng-bootstrap';

@Component({
  selector: 'app-space-usage-bar',
  imports: [NgbProgressbarModule, FileSizePipe],
  templateUrl: './space-usage-bar.component.html',
  styleUrl: './space-usage-bar.component.scss'
})
export class SpaceUsageBarComponent {
  private authService = inject(AuthenticationService);
  usedSpace = computed(() => this.authService.currentUser()?.usedSpace ?? 0);
  totalSpace = computed(() => this.authService.currentUser()?.quota ?? 0);
  progress = computed(() => Math.round((this.usedSpace() / this.totalSpace()) * 100));
  progressStyle = computed(() =>
    this.progress() < 45 ? 'success' :
      this.progress() < 60 ? 'info' :
        this.progress() < 90 ? 'warning' :
          'danger');
}
