import { Component, inject } from '@angular/core';
import { StorageService } from '../../core/services/storage.service';
import { FileSizePipe } from '../../core/pipes/file-size.pipe';

@Component({
  selector: 'app-storage-quota',
  imports: [FileSizePipe],
  templateUrl: './storage-quota.component.html',
  styleUrl: './storage-quota.component.scss',
})
export class StorageQuotaComponent {
  private readonly storageService = inject(StorageService);

  readonly storageUsagePercent = this.storageService.storageUsagePercent;
  readonly storageInfo = this.storageService.storage;
}
