import {AfterViewInit, Component, ElementRef, EventEmitter, NgZone, OnInit, Output, ViewChild} from '@angular/core';
import {CredentialResponse} from "google-one-tap";
import {first} from "rxjs/operators";
import {AuthenticationService} from "../../../services/authentication.service";
import {Router} from "@angular/router";
import {environment} from "../../../../environments/environment";

@Component({
  selector: 'app-google-auth',
  templateUrl: './google-auth.component.html',
  styleUrls: ['./google-auth.component.scss']
})
export class GoogleAuthComponent implements OnInit, AfterViewInit {
  @ViewChild('googleBtn') googleBtn?: ElementRef = new ElementRef({});
  @ViewChild('parentDiv') buttonParent: ElementRef = new ElementRef({});
  @Output() isLoadingEmitter : EventEmitter<boolean> = new EventEmitter<boolean>();

  constructor(
    private authenticationService: AuthenticationService,
    private ngZone: NgZone,
    private router: Router
  ) {
  }

  ngAfterViewInit(): void {
    try {
      // @ts-ignore
      google.accounts.id.initialize({
        client_id: environment.client_id,
        callback: this.handleCredentialResponse.bind(this),
        auto_select: false,
        cancel_on_tap_outside: true
      });

      // @ts-ignore
      google?.accounts.id.renderButton(
        this.googleBtn?.nativeElement,
        {theme: "outline", size: "large" ,width: this.buttonParent?.nativeElement.offsetWidth, locale: "en"
        }
      );
    }catch (e){}
  }

  ngOnInit(): void {
    // @ts-ignore
    window.onGoogleLibraryLoad = () => {
      // @ts-ignore
      google.accounts.id.initialize({
        client_id: environment.client_id,
        callback: this.handleCredentialResponse.bind(this),
        auto_select: false,
        cancel_on_tap_outside: true
      });
      // @ts-ignore
      google.accounts.id.disableAutoSelect();
      // @ts-ignore
      google.accounts.id.renderButton(
        this.googleBtn?.nativeElement,
        {theme: "outline", size: "large", width: this.buttonParent?.nativeElement.offsetWidth, locale: "en"
        }
      );
      // @ts-ignore
      google.accounts.id.prompt();
    };
  }

  handleCredentialResponse=(response: CredentialResponse):void => {
    this.isLoadingEmitter.emit(true);
    this.authenticationService.loginWithGoogle(response.credential)
      .pipe(first())
      .subscribe(
        () => {
          this.ngZone.run(() => {
            this.router.navigate(['files']);
          });
        }, _ => {
          this.isLoadingEmitter.emit(false);
        });
  }
}
