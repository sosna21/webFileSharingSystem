import { Component, inject } from '@angular/core';
import { FileUploadService } from '../../../../../core/services/file-upload.service';
import { FileService } from '../../../../../core/services/file.service';
import { debouncedSignal } from '../../../../../core/utils/signal-utils';

@Component({
  selector: 'app-upload-buttons',
  imports: [],
  templateUrl: './upload-buttons.component.html',
  styleUrl: './upload-buttons.component.scss',
  host: {
    class: 'd-grid gap-1',
    style: 'grid-template-columns: 1fr 1fr',
  },
})
export class UploadButtonsComponent {
  private readonly fileUploadService = inject(FileUploadService);
  private readonly fileService = inject(FileService);
  readonly canUpload = debouncedSignal(
    this.fileService.isParentMinWriteAccess,
    100,
    true,
  );

  uploadSelectedFiles($event: Event) {
    if (!$event.target) return;
    const files = this.getFilesFromInputElement($event.target);
    if (files.length === 0) return;
    const directories: { path: string }[] = [];
    const filesWithPath: { file: File; path: string }[] = files.map((file) => ({
      file: file,
      path: '',
    }));
    this.fileUploadService
      .uploadFiles(directories, filesWithPath, this.fileService.parentId())
      .subscribe();
  }

  uploadSelectedFolder($event: Event) {
    if (!$event.target) return;
    const files = this.getFilesFromInputElement($event.target);
    if (files.length === 0) return;
    const directories = this.getDirectoriesFromFiles(files);
    const filesWithPath: { file: File; path: string }[] = files.map((file) => ({
      file: file,
      path: file.webkitRelativePath,
    }));
    this.fileUploadService
      .uploadFiles(directories, filesWithPath, this.fileService.parentId())
      .subscribe();
  }

  private getDirectoriesFromFiles(files: File[]): { path: string }[] {
    const directories: { path: string }[] = [];
    files.forEach((file) => {
      const dirs = file.webkitRelativePath
        .split('/')
        .slice(0, -1)
        .join('/')
        .concat('/');
      if (!directories.some((d) => d.path === dirs)) {
        directories.push({ path: dirs });
      }
    });

    return directories;
  }

  private getFilesFromInputElement(target: EventTarget): File[] {
    if (!(target instanceof HTMLInputElement)) return [];
    const files = target.files;
    if (files === null) return [];
    return Array.from(files);
  }
}
