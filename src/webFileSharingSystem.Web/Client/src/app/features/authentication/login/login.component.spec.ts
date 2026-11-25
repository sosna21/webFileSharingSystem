import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { of } from 'rxjs';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { AuthenticationService } from '../../../core/services/authentication.service';
import { LoginComponent } from './login.component';

describe('LoginComponent', () => {
  let component: LoginComponent;
  let fixture: ComponentFixture<LoginComponent>;
  let login: ReturnType<typeof vi.fn>;
  let navigate: ReturnType<typeof vi.fn>;

  beforeEach(async () => {
    login = vi.fn(() => of(null));
    navigate = vi.fn(() => Promise.resolve(true));

    await TestBed.configureTestingModule({
      imports: [LoginComponent],
      providers: [
        { provide: AuthenticationService, useValue: { login } },
        { provide: Router, useValue: { navigate } },
      ],
    })
      .overrideComponent(LoginComponent, { set: { template: '' } })
      .compileComponents();

    fixture = TestBed.createComponent(LoginComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('marks required fields touched and does not submit an invalid form', () => {
    component.onSubmit();

    expect(component.loginForm.get('username')?.touched).toBe(true);
    expect(component.loginForm.get('password')?.touched).toBe(true);
    expect(login).not.toHaveBeenCalled();
  });

  it('submits valid credentials and navigates to the return URL', () => {
    component.returnUrl = '/disc/home';
    component.loginForm.setValue({
      username: 'ada',
      password: 'correct horse battery staple',
    });

    component.onSubmit();

    expect(login).toHaveBeenCalledWith('ada', 'correct horse battery staple');
    expect(navigate).toHaveBeenCalledWith(['/disc/home']);
  });
});
