import { ChangeDetectionStrategy, Component, computed, inject, OnInit } from '@angular/core';
import { FileService } from '../../../core/services/file.service';
import {BaseDiscPageComponent} from '../base-disc-page/base-disc-page.component';
import {BaseDiscPageHeaderComponent} from '../base-disc-page/base-disc-page-header/base-disc-page-header.component';
import { MyFilesComponent } from "../my-files/my-files.component";
import { OldTableComponent } from "../old-table/old-table.component";

@Component({
  selector: 'app-recent',
  imports: [BaseDiscPageComponent, BaseDiscPageHeaderComponent, MyFilesComponent, OldTableComponent],
  templateUrl: './recent.component.html',
  styleUrl: './recent.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class RecentComponent implements OnInit {
  private readonly fileService = inject(FileService);

  ngOnInit(): void {
    this.fileService.mode.set('GetRecent');
  }
}
