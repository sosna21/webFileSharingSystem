import { Signal } from "@angular/core";
import { toObservable, toSignal } from "@angular/core/rxjs-interop";
import { debounceTime } from "rxjs";


export function debouncedSignal<T>(signal: Signal<T>, delay: number, initialValue: T) {
    return toSignal(
        toObservable(signal).pipe(debounceTime(delay)),
        { initialValue }
    );
}
