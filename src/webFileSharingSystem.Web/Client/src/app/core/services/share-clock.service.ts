import { Injectable } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { map, timer } from 'rxjs';

const SHARE_CLOCK_TICK_MS = 10_000;

@Injectable({
  providedIn: 'root',
})
export class ShareClockService {
  readonly now = toSignal(
    timer(0, SHARE_CLOCK_TICK_MS).pipe(map(() => Date.now())),
    { initialValue: Date.now() },
  );
}
