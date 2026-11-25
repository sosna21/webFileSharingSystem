import { Component, Input, signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { FileViewService } from '../../../../core/services/file-view.service';
import { SidebarComponent } from './sidebar.component';

@Component({
  selector: 'li[app-nav-link]',
  standalone: true,
  template: '<ng-content />',
})
class NavLinkStubComponent {
  @Input() link = '';
}

@Component({
  selector: 'app-space-usage-bar',
  standalone: true,
  template: '',
})
class SpaceUsageBarStubComponent {}

@Component({
  selector: 'app-upload-buttons',
  standalone: true,
  template: '',
})
class UploadButtonsStubComponent {}

describe('SidebarComponent', () => {
  let fixture: ComponentFixture<SidebarComponent>;
  let isParentMinWriteAccess: ReturnType<typeof signal<boolean>>;

  function uploadPermissionMessage(): string {
    const message = fixture.nativeElement.querySelector('.text-muted');
    return message.textContent.replace(/\s+/g, ' ').trim();
  }

  beforeEach(async () => {
    isParentMinWriteAccess = signal(true);

    await TestBed.configureTestingModule({
      imports: [SidebarComponent],
      providers: [
        {
          provide: FileViewService,
          useValue: {
            isParentMinWriteAccess: isParentMinWriteAccess.asReadonly(),
          } satisfies Pick<FileViewService, 'isParentMinWriteAccess'>,
        },
      ],
    })
      .overrideComponent(SidebarComponent, {
        set: {
          imports: [
            NavLinkStubComponent,
            SpaceUsageBarStubComponent,
            UploadButtonsStubComponent,
          ],
        },
      })
      .compileComponents();

    vi.useFakeTimers();
    fixture = TestBed.createComponent(SidebarComponent);
    fixture.detectChanges();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('shows upload guidance when the parent allows write access', async () => {
    isParentMinWriteAccess.set(true);
    fixture.detectChanges();
    await vi.advanceTimersByTimeAsync(100);
    fixture.detectChanges();

    expect(uploadPermissionMessage()).toContain('Upload files from here');
  });

  it('shows the read-only message when the parent disallows write access', async () => {
    isParentMinWriteAccess.set(false);
    fixture.detectChanges();
    await vi.advanceTimersByTimeAsync(100);
    fixture.detectChanges();

    expect(uploadPermissionMessage()).toContain(
      "You can't upload files to this directory",
    );
  });
});
