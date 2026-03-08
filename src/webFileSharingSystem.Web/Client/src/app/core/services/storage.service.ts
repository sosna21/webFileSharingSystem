import { HttpClient } from '@angular/common/http';
import {
  computed,
  DestroyRef,
  inject,
  Injectable,
  signal,
} from '@angular/core';
import { catchError, EMPTY, switchMap, timer } from 'rxjs';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { environment } from '../../../environments/environment.development';
import { UserStorage } from '../models/user-storage.model';

@Injectable()
export class StorageService {
  private readonly apiUrl = `${environment.apiUrl}/user/me/quota`;
  private readonly refreshInterval = 60000; // 60 seconds
  private http = inject(HttpClient);
  private destroyRef = inject(DestroyRef);

  private readonly _storage = signal<UserStorage | undefined>(undefined);

  readonly storage = this._storage.asReadonly();
  readonly storageUsagePercent = computed(() => {
    const s = this.storage();
    if (!s || !s.quota) return 0;
    return Math.round((s.usedSpace / s.quota) * 100);
  });

  constructor() {
    timer(0, this.refreshInterval)
      .pipe(
        switchMap(() =>
          this.http.get<UserStorage>(this.apiUrl).pipe(catchError(() => EMPTY)),
        ),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe((storage) => this._storage.set(storage));
  }

  refresh() {
    this.http
      .get<UserStorage>(this.apiUrl)
      .subscribe((storage) => this._storage.set(storage));
  }

  updateCurrentUserUsedSpace(difference: number): void {
    if (!this.storage()) return;
    this._storage.update((storage) => ({
      ...storage!,
      usedSpace: storage!.usedSpace + difference,
    }));
  }
}
