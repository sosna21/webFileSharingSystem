import { linkedSignal, Signal } from '@angular/core';
import { toObservable, toSignal } from '@angular/core/rxjs-interop';
import { debounceTime } from 'rxjs';

export function debouncedSignal<T>(
  signal: Signal<T>,
  delay: number,
  initialValue: T,
) {
  return toSignal(toObservable(signal).pipe(debounceTime(delay)), {
    initialValue,
  });
}

export function retainLastDefined<T>(
  signal: Signal<T | undefined>,
  initialValue?: T,
) {
  return linkedSignal<T | undefined, T | undefined>({
    source: () => signal(),
    computation: (
      currentValue: T | undefined,
      previousValue?: { value: T | undefined },
    ) => {
      return currentValue ?? previousValue?.value ?? initialValue;
    },
  });
}
