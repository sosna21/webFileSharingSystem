import { defer, forkJoin, of, Observable } from 'rxjs';
import { catchError, finalize, map } from 'rxjs/operators';
import { MessageSeverity } from '../models/toast-info.model';

export interface BulkActionOptions<T> {
  items: T[];
  action: (item: T) => Observable<unknown>;
  onSuccess?: (item: T) => void;
  onError?: (item: T, error: unknown) => void;
  afterComplete?: (item: T) => void;
  beforeStart?: (item: T) => void;
  toast: (
    title: string,
    message: string,
    severity: MessageSeverity,
  ) => void;
  successMessage: (
    count: number,
    items: T[],
  ) => { title: string; message: string };
}

export function bulkAction<T>(opts: BulkActionOptions<T>) {
  if (opts.items.length === 0) return;

  opts.items.forEach((item) => {
    opts.beforeStart?.(item);
  });

  const tasks = opts.items.map((item) =>
    defer(() => opts.action(item)).pipe(
      map(() => ({ item, success: true })),
      catchError((err) => {
        opts.onError?.(item, err);
        return of({ item, success: false });
      }),
      finalize(() => opts.afterComplete?.(item)),
    ),
  );

  forkJoin(tasks).subscribe((results) => {
    const successes = results.filter((r) => r.success);
    successes.forEach(({ item }) => opts.onSuccess?.(item));

    // Show final toast
    if (successes.length > 0) {
      opts.toast(
        opts.successMessage(
          successes.length,
          successes.map((s) => s.item),
        ).title,
        opts.successMessage(
          successes.length,
          successes.map((s) => s.item),
        ).message,
        MessageSeverity.success,
      );
    }
  });
}
