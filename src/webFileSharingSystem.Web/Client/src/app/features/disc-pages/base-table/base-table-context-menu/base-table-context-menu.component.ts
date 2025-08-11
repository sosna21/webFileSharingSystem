import { CommonModule, NgStyle } from '@angular/common';
import { Component, computed, input, output, viewChild } from '@angular/core';
import { NgbDropdown, NgbDropdownModule } from '@ng-bootstrap/ng-bootstrap';
import { AppFile } from '../../../../core/models/app-file.model';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-base-table-context-menu',
  imports: [NgbDropdownModule, NgStyle, CommonModule, FormsModule],
  templateUrl: './base-table-context-menu.component.html',
  styleUrl: './base-table-context-menu.component.scss'
})
export class BaseTableContextMenuComponent {
  position = input.required<{ x: number, y: number }>();
  selectedFiles = input.required<AppFile[]>();
  anySelectedFileIsUnFavourite = computed(() => this.selectedFiles().some(file => !file.isFavourite));
  dropdown = viewChild(NgbDropdown);
  rename = output<AppFile>();
  toggleFavourite = output<boolean>();
  selectFolder = output<number>();
  download = output();
  delete = output();

  open() {
    this.dropdown()?.open();
  }

  close() {
    if (this.dropdown()?.isOpen()) {
      this.dropdown()?.close();
    }
  }
}
