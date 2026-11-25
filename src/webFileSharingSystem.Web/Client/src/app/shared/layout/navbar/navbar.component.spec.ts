import { Component } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { signal } from '@angular/core';
import { NavigationEnd, Router } from '@angular/router';
import { Subject } from 'rxjs';
import { AuthenticationService } from '../../../core/services/authentication.service';
import { NavbarComponent } from './navbar.component';

@Component({ selector: 'app-navbar-brand', standalone: true, template: '' })
class NavbarBrandStubComponent {}

@Component({ selector: 'app-theme-switch', standalone: true, template: '' })
class ThemeSwitchStubComponent {}

@Component({ selector: 'app-profile-dropdown', standalone: true, template: '' })
class ProfileDropdownStubComponent {}

@Component({ selector: 'app-file-search', standalone: true, template: '' })
class FileSearchStubComponent {}

@Component({ selector: 'app-language-switch', standalone: true, template: '' })
class LanguageSwitchStubComponent {}

describe('NavbarComponent', () => {
  let fixture: ComponentFixture<NavbarComponent>;
  let routerUrl: string;
  let routerEvents: Subject<NavigationEnd>;

  beforeEach(async () => {
    routerUrl = '/disc';
    routerEvents = new Subject<NavigationEnd>();
    const routerDouble = {
      get url() {
        return routerUrl;
      },
      events: routerEvents,
    };

    await TestBed.configureTestingModule({
      imports: [NavbarComponent],
      providers: [
        {
          provide: Router,
          useValue: routerDouble,
        },
        {
          provide: AuthenticationService,
          useValue: {
            isAuthenticated: signal(true).asReadonly(),
          } satisfies Pick<AuthenticationService, 'isAuthenticated'>,
        },
      ],
    })
      .overrideComponent(NavbarComponent, {
        set: {
          imports: [
            NavbarBrandStubComponent,
            ThemeSwitchStubComponent,
            ProfileDropdownStubComponent,
            FileSearchStubComponent,
            LanguageSwitchStubComponent,
          ],
        },
      })
      .compileComponents();

    fixture = TestBed.createComponent(NavbarComponent);
    fixture.detectChanges();
  });

  it('shows search only on disc routes, including after navigation', () => {
    expect(
      fixture.nativeElement.querySelector('app-file-search'),
    ).not.toBeNull();

    routerUrl = '/login';
    routerEvents.next(new NavigationEnd(1, '/disc', '/login'));
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('app-file-search')).toBeNull();

    routerUrl = '/disc/shared';
    routerEvents.next(new NavigationEnd(2, '/login', '/disc/shared'));
    fixture.detectChanges();
    expect(
      fixture.nativeElement.querySelector('app-file-search'),
    ).not.toBeNull();
  });

  it('toggles the sidebar collapse state from the navbar button', () => {
    const toggleButton = fixture.nativeElement.querySelector(
      'button.navbar-toggler',
    ) as HTMLButtonElement;

    expect(fixture.componentInstance.isSidebarCollapsed()).toBe(true);
    toggleButton.click();
    expect(fixture.componentInstance.isSidebarCollapsed()).toBe(false);
    toggleButton.click();
    expect(fixture.componentInstance.isSidebarCollapsed()).toBe(true);
  });
});
