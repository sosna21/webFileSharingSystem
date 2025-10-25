import { ChangeDetectionStrategy, Component, computed, inject, OnInit, signal } from '@angular/core';
import { NgbCollapseModule, NgbPaginationModule, NgbTooltipModule } from '@ng-bootstrap/ng-bootstrap';
import { FileService } from '../../../core/services/file.service';
import { FormsModule } from '@angular/forms';
import { BaseDiscPageHeaderComponent } from "../base-disc-page/base-disc-page-header/base-disc-page-header.component";
import { BaseDiscPageComponent } from "../base-disc-page/base-disc-page.component";
import { BreadcrumbComponent } from "./breadcrumb/breadcrumb.component";
import { HoverClassDirective } from '../../../core/directives/hover-class.directive';
import { ToastService } from '../../../core/services/toast.service';
import { MessageSeverity } from '../../../core/models/toast-info.model';
import { SelectFilenameDirective } from '../../../core/directives/select-filename.directive';

@Component({
  selector: 'app-home',
  imports: [NgbCollapseModule, NgbPaginationModule, FormsModule, BaseDiscPageHeaderComponent, BaseDiscPageComponent, BreadcrumbComponent, SelectFilenameDirective, HoverClassDirective, NgbTooltipModule],
  templateUrl: './home.component.html',
  styleUrl: './home.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class HomeComponent implements OnInit {
  private readonly fileService = inject(FileService);
  private readonly toast = inject(ToastService);
  private readonly names = computed(() => this.fileService.files().map(file => file.fileName));
  readonly showDirCreate = signal(false);
  readonly newFolderName = signal('');

  ngOnInit(): void {
    this.fileService.mode.set('GetAll');
  }

  findUniqueDirName(): string {
    let dirName = "New folder";
    let counter = 0;
    while (this.names().includes(dirName)) {
      dirName = `New folder (${++counter})`
    }
    return dirName;
  }

  resetNewFolderName() {
    this.newFolderName.set(this.findUniqueDirName());
  }

  createDirectory() {
    this.fileService.createDirectory(this.newFolderName()).subscribe({
      next: (response) => {
        this.fileService.files.update(files => [response, ...files]);
        this.newFolderName.set(this.findUniqueDirName());
        this.toast.show("New directory created", `Directory "${response.fileName}" has been created`, MessageSeverity.success);
      },
      error: (error) => {
        this.toast.show("Error creating directory", error?.error, MessageSeverity.error);
      }
    });

    this.cancelRename();
  }

  cancelRename() {
    this.resetNewFolderName();
    this.showDirCreate.set(false);
  }

  initDirCreation() {
    if (!this.showDirCreate())
      this.showDirCreate.set(true);
    this.newFolderName.set(this.findUniqueDirName());
  }

  refetchFiles() {
    this.fileService._fileResource.reload();
  }
}
