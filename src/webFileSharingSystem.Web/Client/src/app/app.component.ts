import { Component } from '@angular/core';
import {NavigationEnd, Router, RouterEvent} from "@angular/router";
import {filter} from "rxjs/operators";
import {AuthenticationService} from "./services/authentication.service";


@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.scss']
})
export class AppComponent {
  title = 'webFileSharingSystem';

  currentRoute: string = "";

  constructor(public router: Router,
              private authenticationService: AuthenticationService){
    router.events.pipe(filter(event => event instanceof NavigationEnd))
      .subscribe(event =>
      {if (event instanceof RouterEvent) {
          this.currentRoute = event.url;
        }});
  }

  public get authenticated() : boolean {
    return !!this.authenticationService.currentUserValue
  }
}

