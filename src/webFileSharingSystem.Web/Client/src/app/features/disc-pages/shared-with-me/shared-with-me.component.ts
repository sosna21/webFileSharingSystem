import { ChangeDetectionStrategy, Component, inject, OnInit } from '@angular/core';
import { BaseDiscPageComponent } from "../base-disc-page/base-disc-page.component";
import { BaseDiscPageHeaderComponent } from "../base-disc-page/base-disc-page-header/base-disc-page-header.component";
import { FileService } from '../../../core/services/file.service';

@Component({
  selector: 'app-shared-with-me',
  imports: [BaseDiscPageComponent, BaseDiscPageHeaderComponent],
  templateUrl: './shared-with-me.component.html',
  styleUrl: './shared-with-me.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class SharedWithMeComponent implements OnInit {
  private readonly fileService = inject(FileService);

  ngOnInit(): void {
    this.fileService.mode.set('GetSharedWithMe');
  }

}
