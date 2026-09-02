import { TestBed } from '@angular/core/testing';
import {
  HttpInterceptorFn,
  HttpRequest,
  HttpResponse,
} from '@angular/common/http';
import { of } from 'rxjs';
import { AuthenticationService } from '../services/authentication.service';
import { JwtTokenService } from '../services/jwt-token.service';
import { Router } from '@angular/router';

import { jwtInterceptor } from './jwt.interceptor';

describe('jwtInterceptor', () => {
  const interceptor: HttpInterceptorFn = (req, next) => 
    TestBed.runInInjectionContext(() => jwtInterceptor(req, next));

  beforeEach(() => {
    TestBed.configureTestingModule({});
  });

  it('should be created', () => {
    expect(interceptor).toBeTruthy();
  });

  it('adds the token to an absolute same-origin API URL', () => {
    TestBed.configureTestingModule({
      providers: [
        {
          provide: AuthenticationService,
          useValue: { currentUser: () => ({ token: 'test-token' }) },
        },
        {
          provide: JwtTokenService,
          useValue: { isTokenExpired: () => false },
        },
        { provide: Router, useValue: { navigate: () => undefined } },
      ],
    });

    let interceptedRequest: HttpRequest<unknown> | undefined;
    const next = (request: HttpRequest<unknown>) => {
      interceptedRequest = request;
      return of(new HttpResponse({ status: 200 }));
    };

    interceptor(
      new HttpRequest(
        'GET',
        `${location.origin}/api/User/Photo/00000000-0000-0000-0000-000000000000`,
      ),
      next,
    ).subscribe();

    expect(interceptedRequest?.headers.get('Authorization')).toBe(
      'Bearer test-token',
    );
  });
});
