import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  signal,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { finalize } from 'rxjs/operators';
import { UserApiService } from '../../core/services/api/user-api.service';
import { AppUserResponse } from '../../core/models/app-user-response.model';
import { UserPhotoService } from '../../core/services/user-photo.service';
import { AuthenticationService } from '../../core/services/authentication.service';
import { ToastService } from '../../core/services/toast.service';
import { MessageSeverity } from '../../core/models/toast-info.model';
import { BackButtonComponent } from '../../shared/back-button/back-button.component';
import { ProfileImageCropperComponent } from './profile-image-cropper/profile-image-cropper.component';
import { ProfileViewComponent } from './profile-view/profile-view.component';
import { ProfilePhotoDropzoneComponent } from './profile-photo-dropzone/profile-photo-dropzone.component';

@Component({
  selector: 'app-profile',
  imports: [
    CommonModule,
    BackButtonComponent,
    ProfileImageCropperComponent,
    ProfileViewComponent,
    ProfilePhotoDropzoneComponent,
  ],
  templateUrl: './profile.component.html',
  styleUrl: './profile.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { 'data-testid': 'profile-component' },
})
export class ProfileComponent {
  private readonly maxPhotoSizeBytes = 5 * 1024 * 1024;
  private readonly allowedPhotoMimeTypes = ['image/jpeg', 'image/png'];
  private readonly userApiService = inject(UserApiService);
  private readonly userPhotoService = inject(UserPhotoService);
  private readonly authService = inject(AuthenticationService);
  private readonly toastService = inject(ToastService);

  readonly profile = signal<AppUserResponse | null>(null);

  readonly isLoading = signal(false);
  readonly isUploading = signal(false);
  readonly selectedPhoto = signal<File | null>(null);

  readonly currentUserId = computed(
    () => this.profile()?.id ?? this.authService.currentUser()?.id ?? null,
  );
  readonly currentPhotoUrl = computed(
    () =>
      this.profile()?.photoUrl ??
      this.authService.currentUser()?.photoUrl ??
      null,
  );

  readonly loadedPhotoUrl = computed(() => {
    return this.userPhotoService.getPhotoUrl(this.currentPhotoUrl());
  });

  constructor() {
    this.loadProfile();
  }

  loadProfile() {
    this.isLoading.set(true);

    this.userApiService
      .getMe()
      .pipe(finalize(() => this.isLoading.set(false)))
      .subscribe({
        next: (profile) => {
          const previousPhotoUrl = this.currentPhotoUrl();
          this.profile.set(profile);
          this.authService.updateCurrentUserPhoto(profile.photoUrl);

          if (previousPhotoUrl && previousPhotoUrl !== profile.photoUrl) {
            this.userPhotoService.clearPhoto(previousPhotoUrl);
          }

          if (profile.photoUrl) {
            this.userPhotoService
              .ensurePhotoLoaded(profile.photoUrl)
              .subscribe();
          }
        },
        error: () => {
          this.toastService.show(
            'Error',
            'Could not load profile information.',
            MessageSeverity.error,
          );
        },
      });
  }

  handleFile(file: File | null) {
    if (!file) {
      this.clearSelection();
      return;
    }

    if (!this.allowedPhotoMimeTypes.includes(file.type)) {
      this.clearSelection();
      this.toastService.show(
        'Invalid format',
        'Only JPEG and PNG formats are allowed.',
        MessageSeverity.error,
      );
      return;
    }

    if (file.size > this.maxPhotoSizeBytes) {
      this.clearSelection();
      this.toastService.show(
        'File too large',
        'Profile photo cannot be larger than 5 MB.',
        MessageSeverity.error,
      );
      return;
    }

    this.selectedPhoto.set(file);
  }

  uploadPhoto(blob: Blob | null) {
    if (!blob) return;
    const croppedBlob = blob;

    if (!croppedBlob) {
      return;
    }

    const fileToUpload = new File(
      [croppedBlob],
      `${this.currentUserId()}_profile-photo.webp`,
      {
        type: 'image/webp',
      },
    );

    this.isUploading.set(true);

    this.userApiService
      .uploadMyPhoto(fileToUpload)
      .pipe(finalize(() => this.isUploading.set(false)))
      .subscribe({
        next: () => {
          this.clearSelection();
          this.userPhotoService.clearPhoto(this.currentPhotoUrl());
          this.toastService.show(
            'Success',
            'Profile photo uploaded successfully.',
            MessageSeverity.success,
          );

          this.loadProfile();
        },
        error: () => {
          this.toastService.show(
            'Error',
            'Could not upload profile photo.',
            MessageSeverity.error,
          );
        },
      });
  }

  clearSelection() {
    this.selectedPhoto.set(null);
  }
}
