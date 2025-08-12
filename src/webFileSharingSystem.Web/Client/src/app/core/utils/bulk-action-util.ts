import { forkJoin, of, Observable } from 'rxjs';
import { catchError, map } from 'rxjs/operators';

export interface BulkActionOptions<T> {
  items: T[];
  action: (item: T) => Observable<any>;
  updateItem?: (item: T, changes: Partial<T>) => void;
  onSuccess?: (item: T) => void;
  onError?: (item: T, error: unknown) => void;
  beforeStart?: (item: T) => void;
  toast: (title: string, message: string, severity: any) => void;
  successMessage: (count: number, items: T[]) => string;
}

export function bulkAction<T>(opts: BulkActionOptions<T>) {
    if (opts.items.length === 0) return;

    opts.items.forEach(item => {
        opts.beforeStart?.(item);
    });

    const tasks = opts.items.map(item =>
        opts.action(item).pipe(
            map(() => ({ item, success: true })),
            catchError(err => {
                opts.onError?.(item, err);
                return of({ item, success: false });
            })
        )
    );

    forkJoin(tasks).subscribe(results => {
        const successes = results.filter(r => r.success);
        successes.forEach(({ item }) => opts.onSuccess?.(item));

        // Show final toast
        if (successes.length > 0) {
            opts.toast(
                'Bulk Action',
                opts.successMessage(successes.length, successes.map(s => s.item)),
                'success'
            );
        }
    });
}
