import {AfterViewInit, Component, ElementRef, HostListener, ViewChild} from '@angular/core';
import {NavigationEnd, Router, RouterEvent} from "@angular/router";
import {filter} from "rxjs/operators";
import {AuthenticationService} from "./services/authentication.service";
import {FileExplorerService} from "./services/file-explorer.service";

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.scss']
})
export class AppComponent implements AfterViewInit {
  title = 'webFileSharingSystem';
  currentRoute: string = "";
  @ViewChild('footer') elementView!: ElementRef;

  ngOnInit(): void {
    window.addEventListener("dragover", e => {
      e && e.preventDefault();
      e.dataTransfer!.effectAllowed = "none";
      e.dataTransfer!.dropEffect = "none";
    }, false);
    window.addEventListener("drop", e => {
      e && e.preventDefault();
      e.dataTransfer!.effectAllowed = "none";
      e.dataTransfer!.dropEffect = "none";
    }, false);
  }

  ngAfterViewInit(): void {
    this.footerResize();
  }

  @HostListener('window:resize', ['$event'])
  onResize(_: any) {
    this.footerResize();
  }

  footerResize() {
    let mainViews: any = document.getElementsByClassName('mainView');
    for (var i = 0; i < mainViews.length; i++) {
      mainViews[i].style.paddingBottom = `${this.elementView.nativeElement.offsetHeight}px`;
    }
  }

  constructor(public router: Router,
              private authenticationService: AuthenticationService, private fileExplorerService: FileExplorerService) {
    router.events.pipe(filter(event => event instanceof NavigationEnd))
      .subscribe(event => {
        fileExplorerService.updateSearchText('');
        if (event instanceof RouterEvent) {
          this.currentRoute = event.url;
        }
      });
  }

  public get authenticated(): boolean {
    return !!this.authenticationService.currentUserValue
  }
}

