import {
  ChangeDetectionStrategy,
  Component,
  inject,
  OnInit,
} from '@angular/core';
import { BaseDiscPageComponent } from '../base-disc-page/base-disc-page.component';
import { BaseDiscPageHeaderComponent } from '../base-disc-page/base-disc-page-header/base-disc-page-header.component';
import { FileService } from '../../../core/services/file.service';

@Component({
  selector: 'app-favourite',
  imports: [BaseDiscPageComponent, BaseDiscPageHeaderComponent],
  templateUrl: './favourite.component.html',
  styleUrl: './favourite.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class FavouriteComponent implements OnInit {
  private readonly fileService = inject(FileService);

  ngOnInit(): void {
    this.fileService.mode.set('GetFavourites');
  }
}
