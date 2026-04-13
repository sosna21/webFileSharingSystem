import { Injectable, inject, signal } from '@angular/core';
import { Observable, of } from 'rxjs';
import { catchError, map } from 'rxjs/operators';
import { UserApiService } from './api/user-api.service';
import { shareReplay } from 'rxjs/operators';

@Injectable({
  providedIn: 'root',
})
export class UserPhotoService {
  private readonly userApiService = inject(UserApiService);
  private readonly photoUrls = signal(new Map<string, string>());
  private readonly missingPhotoUrls = new Set<string>();
  private readonly inFlightRequests = new Map<
    string,
    Observable<string | null>
  >();

  getPhotoUrl(photoUrl: string | null | undefined): string | null {
    if (!photoUrl) {
      return null;
    }

    return this.photoUrls().get(photoUrl) ?? null;
  }

  ensurePhotoLoaded(
    photoUrl: string | null | undefined,
  ): Observable<string | null> {
    if (!photoUrl) {
      return of(null);
    }

    const existingPhotoUrl = this.getPhotoUrl(photoUrl);
    if (existingPhotoUrl) {
      return of(existingPhotoUrl);
    }

    if (this.missingPhotoUrls.has(photoUrl)) {
      return of(null);
    }

    const existingRequest = this.inFlightRequests.get(photoUrl);
    if (existingRequest) {
      return existingRequest;
    }

    const request = this.loadPhoto(photoUrl).pipe(
      shareReplay({ bufferSize: 1, refCount: false }),
    );

    this.inFlightRequests.set(photoUrl, request);
    return request;
  }

  refreshPhoto(photoUrl: string | null | undefined): Observable<string | null> {
    if (!photoUrl) {
      return of(null);
    }

    this.clearPhoto(photoUrl);

    return this.ensurePhotoLoaded(photoUrl);
  }

  clearPhoto(photoUrl: string | null | undefined): void {
    if (!photoUrl) {
      return;
    }

    this.missingPhotoUrls.delete(photoUrl);
    this.inFlightRequests.delete(photoUrl);

    const currentUrl = this.photoUrls().get(photoUrl);
    if (!currentUrl) {
      return;
    }

    URL.revokeObjectURL(currentUrl);

    this.photoUrls.update((current) => {
      const updated = new Map(current);
      updated.delete(photoUrl);
      return updated;
    });
  }

  private loadPhoto(photoUrl: string): Observable<string | null> {
    return this.userApiService.getUserPhoto(photoUrl).pipe(
      map((blob) => {
        this.inFlightRequests.delete(photoUrl);
        this.missingPhotoUrls.delete(photoUrl);

        const nextUrl = URL.createObjectURL(blob);
        const previousUrl = this.photoUrls().get(photoUrl);
        if (previousUrl) {
          URL.revokeObjectURL(previousUrl);
        }

        this.photoUrls.update((current) => {
          const updated = new Map(current);
          updated.set(photoUrl, nextUrl);
          return updated;
        });

        return nextUrl;
      }),
      catchError(() => {
        this.inFlightRequests.delete(photoUrl);
        this.missingPhotoUrls.add(photoUrl);
        return of(null);
      }),
    );
  }
}
