import { signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { StorageService } from '../../../../../core/services/storage.service';
import { UserStorage } from '../../../../../core/models/user-storage.model';
import { SpaceUsageBarComponent } from './space-usage-bar.component';

describe('SpaceUsageBarComponent', () => {
  let component: SpaceUsageBarComponent;
  let fixture: ComponentFixture<SpaceUsageBarComponent>;
  let storage: ReturnType<typeof signal<UserStorage | undefined>>;
  let storageUsagePercent: ReturnType<typeof signal<number>>;

  beforeEach(async () => {
    storage = signal<UserStorage | undefined>(undefined);
    storageUsagePercent = signal(0);

    await TestBed.configureTestingModule({
      imports: [SpaceUsageBarComponent],
      providers: [
        {
          provide: StorageService,
          useValue: {
            storage: storage.asReadonly(),
            storageUsagePercent: storageUsagePercent.asReadonly(),
          },
        },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(SpaceUsageBarComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('shows quota usage and warns when available space is low', () => {
    expect(fixture.nativeElement.querySelector('ngb-progressbar')).toBeNull();

    storage.set({ usedSpace: 92, quota: 100 });
    storageUsagePercent.set(92);
    fixture.detectChanges();

    expect(
      fixture.nativeElement.querySelector('ngb-progressbar'),
    ).not.toBeNull();
    expect(fixture.nativeElement.textContent).toContain('Used space:');
    expect(fixture.nativeElement.textContent).toContain('92 B');
    expect(fixture.nativeElement.textContent).toContain(
      'Available space is low.',
    );

    storageUsagePercent.set(100);
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain('No free space left.');
  });
});
