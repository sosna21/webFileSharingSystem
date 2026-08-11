import {
  AfterViewInit,
  Component,
  ElementRef,
  NgZone,
  OnInit,
  output,
  viewChild,
} from '@angular/core';
import { Router } from '@angular/router';
import { finalize, first } from 'rxjs';

import { CredentialResponse } from 'google-one-tap';
import { environment } from '../../../../../environments/environment';
import { AuthenticationService } from '../../../../core/services/authentication.service';

@Component({
  selector: 'app-google-account-auth',
  imports: [],
  templateUrl: './google-account-auth.component.html',
  styleUrl: './google-account-auth.component.scss',
})
export class GoogleAccountAuthComponent implements OnInit, AfterViewInit {
  private readonly googleBtn = viewChild.required<ElementRef>('googleBtn');
  private readonly buttonParent = viewChild<ElementRef>('parentDiv');
  isLoadingEmitter = output<boolean>();

  constructor(
    private authenticationService: AuthenticationService,
    private ngZone: NgZone,
    private router: Router,
  ) {}

  ngAfterViewInit(): void {
    try {
      // @ts-ignore
      google.accounts.id.initialize({
        client_id: environment.client_id,
        callback: this.handleCredentialResponse.bind(this),
        auto_select: false,
        cancel_on_tap_outside: true,
      });

      // @ts-ignore
      google?.accounts.id.renderButton(this.googleBtn().nativeElement, {
        theme: 'outline',
        size: 'large',
        width: this.buttonParent()?.nativeElement.offsetWidth,
        locale: 'en',
      });
    } catch (_) {}
  }

  ngOnInit(): void {
    // @ts-ignore
    window.onGoogleLibraryLoad = () => {
      // @ts-ignore
      google.accounts.id.initialize({
        client_id: environment.client_id,
        callback: this.handleCredentialResponse.bind(this),
        auto_select: false,
        cancel_on_tap_outside: true,
      });
      // @ts-ignore
      google.accounts.id.disableAutoSelect();
      // @ts-ignore
      google.accounts.id.renderButton(this.googleBtn().nativeElement, {
        theme: 'outline',
        size: 'large',
        width: this.buttonParent()?.nativeElement.offsetWidth,
        locale: 'en',
      });
      // @ts-ignore
      google.accounts.id.prompt();
    };
  }

  handleCredentialResponse = (response: CredentialResponse): void => {
    this.isLoadingEmitter.emit(true);
    this.authenticationService
      .loginWithGoogle(response.credential)
      .pipe(
        first(),
        finalize(() => this.isLoadingEmitter.emit(false)),
      )
      .subscribe({
        next: () => {
          this.ngZone.run(() => {
            this.router.navigate(['disc/home']);
          });
        },
        error: (_) => {
          this.isLoadingEmitter.emit(false);
        },
      });
  };
}
