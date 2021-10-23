import {AfterViewInit, Component, ElementRef, OnInit, ViewChild} from '@angular/core';
import {AuthenticationService} from "../../services/authentication.service"
import {Router} from "@angular/router";
import {fromEvent} from "rxjs";
import {debounceTime, distinctUntilChanged, map} from "rxjs/operators";
import {FileExplorerService} from "../../services/file-explorer.service";

@Component({
  selector: 'app-navbar',
  templateUrl: './navbar.component.html',
  styleUrls: ['./navbar.component.scss']
})
export class NavbarComponent implements OnInit, AfterViewInit {
  @ViewChild(('filter')) filter: ElementRef | undefined;

  constructor(private authenticationService: AuthenticationService, private router: Router, private fileExplorerService: FileExplorerService) {
  }

  ngAfterViewInit() {
    fromEvent(this.filter?.nativeElement, 'keyup')
      .pipe(
        debounceTime<any>(1000),
        map((event: Event) => (<HTMLInputElement>event.target).value),
        distinctUntilChanged(),
        map(value => this.fileExplorerService.updateSearchText(value))
      ).subscribe()
  }

  ngOnInit(): void {
  }

  logout() {
    this.authenticationService.logout();
    this.router.navigate(['/login']);
  }

  public get authenticated(): boolean {
    return !!this.authenticationService.currentUserValue
  }

}
