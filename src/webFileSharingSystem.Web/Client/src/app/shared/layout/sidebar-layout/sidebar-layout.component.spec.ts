import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ModalService } from '../../../core/services/modal.service';
import { SidebarLayoutComponent } from './sidebar-layout.component';

describe('SidebarLayoutComponent', () => {
  let fixture: ComponentFixture<SidebarLayoutComponent>;
  let keyboardShortcutsModal: () => Promise<boolean>;
  const targets: HTMLElement[] = [];

  function dispatchQuestionMark(target: HTMLElement): KeyboardEvent {
    const event = new KeyboardEvent('keydown', {
      key: '?',
      bubbles: true,
      cancelable: true,
    });
    target.dispatchEvent(event);
    return event;
  }

  beforeEach(async () => {
    keyboardShortcutsModal = vi.fn(() => Promise.resolve(false));

    await TestBed.configureTestingModule({
      imports: [SidebarLayoutComponent],
      providers: [
        {
          provide: ModalService,
          useValue: {
            keyboardShortcutsModal,
          } satisfies Pick<ModalService, 'keyboardShortcutsModal'>,
        },
      ],
    })
      .overrideComponent(SidebarLayoutComponent, {
        set: {
          imports: [],
          template: '',
        },
      })
      .compileComponents();

    fixture = TestBed.createComponent(SidebarLayoutComponent);
    fixture.detectChanges();
  });

  afterEach(() => {
    targets.splice(0).forEach((target) => target.remove());
  });

  it('opens the shortcuts modal for the question-mark key', () => {
    const event = dispatchQuestionMark(fixture.nativeElement);

    expect(keyboardShortcutsModal).toHaveBeenCalledOnce();
    expect(event.defaultPrevented).toBe(true);
  });

  it('does not open the modal for unrelated keys', () => {
    const event = new KeyboardEvent('keydown', {
      key: 'a',
      bubbles: true,
      cancelable: true,
    });
    fixture.nativeElement.dispatchEvent(event);

    expect(keyboardShortcutsModal).not.toHaveBeenCalled();
    expect(event.defaultPrevented).toBe(false);
  });

  it.each(['input', 'textarea', 'contenteditable'] as const)(
    'ignores the question-mark key when focused on %s',
    (targetType) => {
      let target: HTMLElement;
      if (targetType === 'input') {
        target = document.createElement('input');
      } else if (targetType === 'textarea') {
        target = document.createElement('textarea');
      } else {
        target = document.createElement('div');
        target.setAttribute('contenteditable', 'true');
        Object.defineProperty(target, 'isContentEditable', { value: true });
      }

      document.body.appendChild(target);
      targets.push(target);

      const event = dispatchQuestionMark(target);

      expect(keyboardShortcutsModal).not.toHaveBeenCalled();
      expect(event.defaultPrevented).toBe(false);
    },
  );
});
