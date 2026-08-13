import {
  ApplicationConfig,
  LOCALE_ID,
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
import {
  provideTimeago,
  TimeagoIntl,
  TimeagoCustomFormatter,
  TimeagoFormatter,
} from 'ngx-timeago';

import { strings as enStrings } from 'ngx-timeago/language-strings/en.js';
import { strings as plStrings } from 'ngx-timeago/language-strings/pl.js';

export function timeagoIntlFactory(locale: string): TimeagoIntl {
  const intl = new TimeagoIntl();
  const baseLocale = locale.split('-')[0].toLowerCase();
  intl.strings = baseLocale === 'pl' ? plStrings : enStrings;
  return intl;
}

export const appConfig: ApplicationConfig = {
  providers: [
    provideZonelessChangeDetection(),
    provideRouter(routes),
    provideHttpClient(withXhr(), withInterceptors([jwtInterceptor])),
    provideTimeago({
      intl: {
        provide: TimeagoIntl,
        useFactory: timeagoIntlFactory,
        deps: [LOCALE_ID],
      },
      formatter: {
        provide: TimeagoFormatter,
        useClass: TimeagoCustomFormatter,
      },
    }),
  ],
};
