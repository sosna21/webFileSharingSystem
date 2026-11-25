import { ComponentFixture, TestBed } from '@angular/core/testing';
import { signal } from '@angular/core';
import { StateService, ThemeMode } from '../../core/services/state.service';
import { ThemeSwitchComponent } from './theme-switch.component';

describe('ThemeSwitchComponent', () => {
  let fixture: ComponentFixture<ThemeSwitchComponent>;
  let selectedTheme: ReturnType<typeof signal<ThemeMode>>;
  let changeTheme: ReturnType<typeof vi.fn<(theme: ThemeMode) => void>>;

  beforeEach(async () => {
    selectedTheme = signal<ThemeMode>('dark');
    changeTheme = vi.fn<(theme: ThemeMode) => void>();

    await TestBed.configureTestingModule({
      imports: [ThemeSwitchComponent],
      providers: [
        {
          provide: StateService,
          useValue: {
            selectedTheme: selectedTheme.asReadonly(),
            changeTheme,
          } satisfies Pick<StateService, 'selectedTheme' | 'changeTheme'>,
        },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(ThemeSwitchComponent);
    fixture.detectChanges();
  });

  it('shows the icon and active item for the current theme', () => {
    const icon = fixture.nativeElement.querySelector('a i') as HTMLElement;
    const activeItem = fixture.nativeElement.querySelector(
      'button.dropdown-item.active',
    ) as HTMLButtonElement;

    expect(icon.classList.contains('bi-moon-stars-fill')).toBe(true);
    expect(activeItem.textContent).toContain('Dark');
    expect(activeItem.querySelector('.bi-check')).not.toBeNull();
  });

  it.each([
    ['auto', 0],
    ['light', 1],
    ['dark', 2],
  ] as const)(
    'requests the %s theme when its menu item is selected',
    (theme, buttonIndex) => {
      const buttons = fixture.nativeElement.querySelectorAll(
        'button.dropdown-item',
      ) as NodeListOf<HTMLButtonElement>;

      buttons[buttonIndex].click();

      expect(changeTheme).toHaveBeenCalledWith(theme);
    },
  );
});
