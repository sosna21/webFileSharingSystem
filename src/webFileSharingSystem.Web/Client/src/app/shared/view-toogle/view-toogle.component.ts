import { Component, model } from '@angular/core';
import { ViewToogleBtnComponent } from './view-toogle-btn/view-toogle-btn.component';
import { ViewMode } from '../../core/services/state.service';
import { NgTemplateOutlet } from '@angular/common';

@Component({
  selector: 'app-view-toogle',
  imports: [ViewToogleBtnComponent, NgTemplateOutlet],
  templateUrl: './view-toogle.component.html',
  styleUrl: './view-toogle.component.scss',
})
export class ViewToogleComponent {
  readonly selectedView = model<ViewMode>('list');
}
