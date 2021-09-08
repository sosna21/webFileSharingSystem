import { Component } from '@angular/core';
import {NavigationEnd, Router, RouterEvent} from "@angular/router";
import {filter} from "rxjs/operators";


@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.scss']
})
export class AppComponent {
  title = 'client';

  currentRoute: string = "";

  constructor(private router: Router){
    router.events.pipe(filter(event => event instanceof NavigationEnd))
      .subscribe(event =>
      {if (event instanceof RouterEvent) {
          this.currentRoute = event.url;
        }});
  }
}

