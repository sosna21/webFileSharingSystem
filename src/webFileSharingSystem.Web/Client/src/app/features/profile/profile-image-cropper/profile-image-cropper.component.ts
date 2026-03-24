import {
  ChangeDetectionStrategy,
  Component,
  input,
  output,
  signal,
} from '@angular/core';
import {
  ImageCropperComponent,
  type ImageCroppedEvent,
} from 'ngx-image-cropper';

@Component({
  selector: 'app-profile-image-cropper',
  imports: [ImageCropperComponent],
  templateUrl: './profile-image-cropper.component.html',
  styleUrl: './profile-image-cropper.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ProfileImageCropperComponent {
  readonly selectedPhoto = input.required<File>();
  readonly selectedPhotoName = input<string | null>(null);
  readonly isUploading = input(false);

  readonly savePhoto = output<Blob>();
  readonly cancel = output<void>();

  readonly croppedImageBlob = signal<Blob | null>(null);

  imageCropped(event: ImageCroppedEvent) {
    if (event.blob) {
      this.croppedImageBlob.set(event.blob);
    }
  }

  onSave() {
    const blob = this.croppedImageBlob();
    if (blob) {
      this.savePhoto.emit(blob);
    }
  }

  onCancel() {
    this.cancel.emit();
  }
}
