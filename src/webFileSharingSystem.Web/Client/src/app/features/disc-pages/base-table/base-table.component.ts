import { Component, computed, inject, linkedSignal } from '@angular/core';
import { AppFile, FileStatus } from '../../../core/models/app-file.model';
import { FileService } from '../../../core/services/file.service';
import { FileToIconPipe } from "../../../core/pipes/file-to-icon.pipe";
import { CommonModule } from '@angular/common';
import { NgbDropdownModule, NgbTooltipModule } from '@ng-bootstrap/ng-bootstrap';
import { TimeagoModule } from 'ngx-timeago';
import { FileSizePipe } from "../../../core/pipes/file-size.pipe";
import { ClicableIconDirective } from '../../../core/directives/clicable-icon.directive';
import { FormsModule } from '@angular/forms';
import { SelectFilenameDirective } from '../../../core/directives/select-filename.directive';

@Component({
  selector: 'app-base-table',
  imports: [CommonModule, FileToIconPipe, NgbTooltipModule, NgbDropdownModule, TimeagoModule, FileSizePipe, ClicableIconDirective, FormsModule],
  templateUrl: './base-table.component.html',
  styleUrl: './base-table.component.scss',
})
export class BaseTableComponent {

  private readonly fileService = inject(FileService);
  fileResource = this.fileService.fileResource;
  fileResponseResponse = this.fileService.fileResponseResource;
  areAllCheckboxesChecked = computed(() => this.files().length > 0 && this.files().every(file => file.checked));
  files = linkedSignal(() => this.fileResponseResponse()?.items || []);

  convertToAngularUTC(date: Date): any {
    return new Date(date + 'Z');
  }

  checkAllCheckBox(ev: any) {
    this.files.update(files => files.map(file => ({ ...file, checked: ev.target.checked })));
  }

  isFileUploadCompleted(file: AppFile) {
    return file.fileStatus === FileStatus.Completed;
  }

  selectFolder(folderId: number) {
    this.fileService.goToFolder(folderId);
  }

  selectFile(file: AppFile, event: MouseEvent) {
    this.files.update(files => files.map(f => f === file ? { ...f, checked: true } : { ...f, checked: false }));
  }
}
