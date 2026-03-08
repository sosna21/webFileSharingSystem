import { Component, computed, inject } from '@angular/core';
import { FileSizePipe } from '../../../../../core/pipes/file-size.pipe';
import { NgbProgressbarModule } from '@ng-bootstrap/ng-bootstrap';
import { StorageService } from '../../../../../core/services/storage.service';

@Component({
  selector: 'app-space-usage-bar',
  imports: [NgbProgressbarModule, FileSizePipe],
  templateUrl: './space-usage-bar.component.html',
  styleUrl: './space-usage-bar.component.scss',
})
export class SpaceUsageBarComponent {
  private storageService = inject(StorageService);
  isLoaded = computed(() => !!this.storageService.storage());
  storage = this.storageService.storage;
  progress = this.storageService.storageUsagePercent;
  progressStyle = computed(() =>
    this.progress() < 45
      ? 'success'
      : this.progress() < 60
        ? 'info'
        : this.progress() < 90
          ? 'warning'
          : 'danger',
  );
}
