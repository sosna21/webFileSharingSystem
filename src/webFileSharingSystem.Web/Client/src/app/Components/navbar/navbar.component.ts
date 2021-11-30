import {AfterViewInit, Component, EventEmitter,ElementRef, OnInit, ViewChild, Output} from '@angular/core';
import {AuthenticationService} from "../../services/authentication.service"
import {Router} from "@angular/router";
import {fromEvent} from "rxjs";
import {debounceTime, map} from "rxjs/operators";
import {FileExplorerService} from "../../services/file-explorer.service";

@Component({
  selector: 'app-navbar',
  templateUrl: './navbar.component.html',
  styleUrls: ['./navbar.component.scss']
})
export class NavbarComponent implements OnInit, AfterViewInit {
  @ViewChild(('filter')) filter: ElementRef | undefined;

  constructor(private authenticationService: AuthenticationService,
              private router: Router, private fileExplorerService: FileExplorerService) {
  }

  @Output() toggleCollapsed = new EventEmitter<boolean>();
  private isCollapsed: boolean = true;

  ngAfterViewInit() {
    fromEvent(this.filter?.nativeElement, 'keyup')
      .pipe(
        debounceTime<any>(1000),
        map((event: Event) => (<HTMLInputElement>event.target).value),
        map(value => this.fileExplorerService.updateSearchText(value))
      ).subscribe()

    this.fileExplorerService.searchedText.subscribe(response => {
      this.filter!.nativeElement.value = response;
    });
  }

  ngOnInit(): void {
  }

  logout() {
    this.authenticationService.logout().subscribe(
      () =>
        this.router.navigate(['/login']),
      () =>
        this.router.navigate(['/login'])
    )

  }

  toggleSidebarCollapse(){
    this.isCollapsed = !this.isCollapsed;
    this.toggleCollapsed.emit(this.isCollapsed)
}

  public get authenticated(): boolean {
    return !!this.authenticationService.currentUserValue
  }
}
