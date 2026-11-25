import { TestBed } from '@angular/core/testing';
import { MessageSeverity, ToastInfo } from '../models/toast-info.model';
import { ToastService } from './toast.service';

describe('ToastService', () => {
  let service: ToastService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(ToastService);
  });

  it('starts with an empty readonly toast list', () => {
    expect(service.toasts$()).toEqual([]);
  });

  it('creates a toast with the supplied content and default values', () => {
    service.show('Saved', 'Your changes were saved.');

    expect(service.toasts$()).toEqual([
      {
        id: 0,
        header: 'Saved',
        body: 'Your changes were saved.',
        type: MessageSeverity.default,
        delay: 5000,
      },
    ]);
  });

  it.each([
    { type: MessageSeverity.default, delay: 1000 },
    { type: MessageSeverity.info, delay: 2000 },
    { type: MessageSeverity.success, delay: 3000 },
    { type: MessageSeverity.error, delay: 4000 },
  ])('preserves explicit severity $type and delay $delay', ({ type, delay }) => {
    service.show('Status', 'A message.', type, delay);

    expect(service.toasts$()[0]).toMatchObject({ type, delay });
  });

  it('preserves an explicitly supplied zero delay', () => {
    service.show('Immediate', 'Dismiss immediately.', undefined, 0);

    expect(service.toasts$()[0].delay).toBe(0);
  });

  it('retains at most two toasts and evicts the oldest first', () => {
    service.show('First', 'First message');
    service.show('Second', 'Second message');
    expect(service.toasts$()).toHaveLength(2);

    service.show('Third', 'Third message');

    expect(service.toasts$().map((toast) => toast.header)).toEqual([
      'Second',
      'Third',
    ]);
    expect(service.toasts$().map((toast) => toast.id)).toEqual([1, 2]);
  });

  it('removes only the matching toast', () => {
    service.show('First', 'First message');
    service.show('Second', 'Second message');
    const [first, second] = service.toasts$();

    service.remove(first);

    expect(service.toasts$()).toEqual([second]);
  });

  it('leaves the list unchanged when removing a toast that is not present', () => {
    service.show('Present', 'Keep this message');
    const [present] = service.toasts$();
    const absent: ToastInfo = {
      id: 10,
      header: 'Absent',
      body: 'This message was never added.',
    };

    service.remove(absent);

    expect(service.toasts$()).toEqual([present]);
  });

  it('clears all toasts', () => {
    service.show('First', 'First message');
    service.show('Second', 'Second message');

    service.clear();

    expect(service.toasts$()).toEqual([]);
  });

  it('continues the ID sequence after clearing', () => {
    service.show('First', 'First message');
    service.show('Second', 'Second message');
    service.clear();

    service.show('Third', 'Third message');
    service.show('Fourth', 'Fourth message');

    expect(service.toasts$().map((toast) => toast.id)).toEqual([2, 3]);
  });
});
