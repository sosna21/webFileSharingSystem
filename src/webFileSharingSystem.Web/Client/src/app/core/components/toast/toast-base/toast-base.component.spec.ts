import { By } from '@angular/platform-browser';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { NgbToast } from '@ng-bootstrap/ng-bootstrap';
import { firstValueFrom } from 'rxjs';
import { vi } from 'vitest';
import { ToastInfo } from '../../../models/toast-info.model';
import { ToastService } from '../../../services/toast.service';
import { ToastBaseComponent } from './toast-base.component';

describe('ToastBaseComponent', () => {
  let component: ToastBaseComponent;
  let fixture: ComponentFixture<ToastBaseComponent>;
  let toastService: { remove: ReturnType<typeof vi.fn> };
  const toast: ToastInfo = {
    id: 1,
    header: 'Upload complete',
    body: 'The file is ready.',
    delay: 60000,
  };

  beforeEach(async () => {
    toastService = { remove: vi.fn() };

    await TestBed.configureTestingModule({
      imports: [ToastBaseComponent],
      providers: [{ provide: ToastService, useValue: toastService }],
    }).compileComponents();

    fixture = TestBed.createComponent(ToastBaseComponent);
    component = fixture.componentInstance;
    fixture.componentRef.setInput('toast', toast);
    fixture.detectChanges();
  });

  it('renders the toast message and removes it when hidden', async () => {
    expect(fixture.nativeElement.textContent).toContain('Upload complete');
    expect(fixture.nativeElement.textContent).toContain('The file is ready.');

    const ngbToast = fixture.debugElement.query(By.directive(NgbToast))
      .componentInstance as NgbToast;
    ngbToast.animation = false;
    await firstValueFrom(ngbToast.hide());

    expect(toastService.remove).toHaveBeenCalledWith(toast);
  });

  it('copies the toast body when clicked', () => {
    const originalClipboard = Object.getOwnPropertyDescriptor(
      navigator,
      'clipboard',
    );
    const writeText = vi.fn();
    Object.defineProperty(navigator, 'clipboard', {
      configurable: true,
      value: { writeText },
    });

    try {
      const toastElement = fixture.nativeElement.querySelector(
        'ngb-toast',
      ) as HTMLElement;
      toastElement.dispatchEvent(new MouseEvent('click', { bubbles: true }));

      expect(writeText).toHaveBeenCalledWith(toast.body);
    } finally {
      if (originalClipboard) {
        Object.defineProperty(navigator, 'clipboard', originalClipboard);
      } else {
        Reflect.deleteProperty(navigator, 'clipboard');
      }
    }
  });
});
