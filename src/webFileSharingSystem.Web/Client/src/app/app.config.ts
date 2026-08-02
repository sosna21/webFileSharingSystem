import {
  ApplicationConfig,
  provideZonelessChangeDetection,
} from '@angular/core';
import { provideRouter } from '@angular/router';
import { routes } from './app.routes';
import {
  provideHttpClient,
  withInterceptors,
  withXhr,
} from '@angular/common/http';
import { jwtInterceptor } from './core/interceptors/jwt.interceptor';
import { provideTimeago } from 'ngx-timeago';

export const appConfig: ApplicationConfig = {
  providers: [
    provideZonelessChangeDetection(),
    provideRouter(routes),
    provideHttpClient(withXhr(), withInterceptors([jwtInterceptor])),
    provideTimeago(),
  ],
};
