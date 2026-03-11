import {
  HttpErrorResponse,
  HttpEvent,
  HttpHandlerFn,
  HttpInterceptorFn,
  HttpRequest,
} from '@angular/common/http';
import { inject } from '@angular/core';
import { AuthenticationService } from '../services/authentication.service';
import {
  BehaviorSubject,
  catchError,
  filter,
  Observable,
  switchMap,
  take,
  throwError,
} from 'rxjs';
import { environment } from '../../../environments/environment';
import { Router } from '@angular/router';
import { JwtTokenService } from '../services/jwt-token.service';

export const jwtInterceptor: HttpInterceptorFn = (req, next) => {
  const router = inject(Router);
  const authenticationService = inject(AuthenticationService);
  const jwtService = inject(JwtTokenService);

  const user = authenticationService.currentUser();
  const isLoggedIn = !!user?.token;
  const isApiUrl = req.url.startsWith(environment.apiUrl);

  if (isLoggedIn && isApiUrl) {
    req = addToken(req, user!.token);
  }

  return next(req).pipe(
    catchError((error) => {
      if (error instanceof HttpErrorResponse && error.status === 401) {
        if (jwtService.isTokenExpired()) {
          return handle401Error(req, next, authenticationService, router);
        }
      }

      return throwError(() => error);
    }),
  );
};

const addToken = (request: HttpRequest<any>, token: string) => {
  return request.clone({
    setHeaders: {
      Authorization: `Bearer ${token}`,
    },
  });
};

let isRefreshing = false;
const refreshTokenSubject = new BehaviorSubject<string | null>(null);

const handle401Error = (
  request: HttpRequest<any>,
  next: HttpHandlerFn,
  authenticationService: AuthenticationService,
  router: Router,
): Observable<HttpEvent<any>> => {
  if (!isRefreshing) {
    isRefreshing = true;
    refreshTokenSubject.next(null);

    return authenticationService.refreshToken().pipe(
      switchMap((token: any) => {
        isRefreshing = false;
        refreshTokenSubject.next(token);
        return next(addToken(request, token));
      }),
      catchError((error) => {
        isRefreshing = false;
        refreshTokenSubject.next(null);
        router.navigate(['/login']);
        return throwError(() => error);
      }),
    );
  } else {
    return refreshTokenSubject.pipe(
      filter((token) => token != null),
      take(1),
      switchMap((jwt) => next(addToken(request, jwt!))),
    );
  }
};
