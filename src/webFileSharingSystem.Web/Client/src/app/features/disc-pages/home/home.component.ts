import { ChangeDetectionStrategy, Component, computed, inject, OnInit } from '@angular/core';
import { NgbCollapseModule, NgbPaginationModule } from '@ng-bootstrap/ng-bootstrap';
import { FileService } from '../../../core/services/file.service';
import { FormsModule } from '@angular/forms';
import { BaseDiscPageHeaderComponent } from "../base-disc-page/base-disc-page-header/base-disc-page-header.component";
import { BaseDiscPageComponent } from "../base-disc-page/base-disc-page.component";

@Component({
  selector: 'app-home',
  imports: [NgbCollapseModule, NgbPaginationModule, FormsModule, BaseDiscPageHeaderComponent, BaseDiscPageComponent],
  templateUrl: './home.component.html',
  styleUrl: './home.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class HomeComponent implements OnInit {
  private readonly fileService = inject(FileService);


  ngOnInit(): void {
    this.fileService.mode.set('GetAll');
    this.fileService.parentId.set(null);
  }
}
