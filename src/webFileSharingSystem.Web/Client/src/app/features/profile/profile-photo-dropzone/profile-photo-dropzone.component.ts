import {
  ChangeDetectionStrategy,
  Component,
  output,
  signal,
} from '@angular/core';

@Component({
  selector: 'app-profile-photo-dropzone',
  imports: [],
  templateUrl: './profile-photo-dropzone.component.html',
  styleUrl: './profile-photo-dropzone.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ProfilePhotoDropzoneComponent {
  readonly photoSelected = output<File>();
  readonly isDragOver = signal(false);

  onPhotoSelected(event: Event) {
    const input = event.target as HTMLInputElement;
    const file = input.files?.item(0) ?? null;
    if (file) {
      this.photoSelected.emit(file);
    }
    input.value = '';
  }

  onDragOver(event: DragEvent) {
    event.preventDefault();
    event.stopPropagation();
    this.isDragOver.set(true);
  }

  onDragLeave(event: DragEvent) {
    event.preventDefault();
    event.stopPropagation();
    this.isDragOver.set(false);
  }

  onDrop(event: DragEvent) {
    event.preventDefault();
    event.stopPropagation();
    this.isDragOver.set(false);

    const file = event.dataTransfer?.files.item(0) ?? null;
    if (file) {
      this.photoSelected.emit(file);
    }
  }
}
