import { ChangeDetectionStrategy, Component, inject, OnInit } from '@angular/core';
import { ToastService } from '../../../core/services/toast.service';
import { MessageSeverity } from '../../../core/models/toast-info.model';

@Component({
  selector: 'app-favourite',
  imports: [],
  templateUrl: './favourite.component.html',
  styleUrl: './favourite.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class FavouriteComponent implements OnInit {
  private tostsService = inject(ToastService);


  ngOnInit(): void {
    this.tostsService.show('Favourite', 'This is a toast message', MessageSeverity.error);
  }

}
