import { Injectable, signal } from '@angular/core';
import { MessageSeverity, ToastInfo } from '../models/toast-info.model';

@Injectable({
  providedIn: 'root',
})
export class ToastService {
  private toasts = signal<ToastInfo[]>([]);
  private idGenerator = 0;
  private maxToasts = 2;
  toasts$ = this.toasts.asReadonly();

  show(header: string, body: string, type?: MessageSeverity, delay?: number) {
    const toast: ToastInfo = {
      id: this.nextId(),
      header: header,
      body: body,
      type: type || MessageSeverity.default,
      delay: delay || 5000,
    };
    if (this.toasts().length >= this.maxToasts) {
      this.toasts.update((current) => [...current.slice(1), toast]);
    } else {
      this.toasts.update((current) => [...current, toast]);
    }
  }

  private nextId() {
    return this.idGenerator++;
  }

  remove(toast: ToastInfo) {
    this.toasts.update((current) => current.filter((t) => t != toast));
  }

  clear() {
    this.toasts.set([]);
  }
}
