import {Component, Input, OnDestroy, OnInit} from '@angular/core';
import {AuthenticationService} from "../../services/authentication.service";
import {SizeConverterPipe} from "../common/sizeConverterPipe";
import {Observable, Subscription} from "rxjs";
import {Router, NavigationStart} from "@angular/router";
import {filter} from 'rxjs/operators';

@Component({
  selector: 'app-sidebar',
  templateUrl: './sidebar.component.html',
  styleUrls: ['./sidebar.component.scss']
})
export class SidebarComponent implements OnInit, OnDestroy {
  @Input() toggleCollapsed: Observable<any> | undefined;
  usedSpace: number = 0;
  quota: number = 0;
  isCollapsed = true;
  isShareItemActive: boolean = false;
  dynamic = 0;
  type: 'bg-success' | 'bg-info' | 'bg-warning' | 'bg-danger' = 'bg-info';

  constructor(private authenticationService: AuthenticationService, private router: Router) {
  }

  private subscriptions: Subscription[] = []

  ngOnInit(): void {
    this.subscriptions.push(this.authenticationService.currentUser.subscribe(user => {
      if (!user) return;
      this.usedSpace = user.usedSpace;
      this.quota = user.quota;
      this.calculateProgressPercent();
    }));


    if (this.toggleCollapsed)
      this.subscriptions.push(this.toggleCollapsed.subscribe(_ => {
        this.isCollapsed = !this.isCollapsed;
      }));


    this.subscriptions.push(this.router.events
      .pipe(filter(event => event instanceof NavigationStart))
      .subscribe(_ => this.isCollapsed = true));
  }

  ngOnDestroy() {
    this.subscriptions.forEach((subscription) => subscription.unsubscribe());
  }

  calculateProgressPercent(): void {
    let value = Math.round(this.usedSpace / this.quota * 100);
    let type: 'bg-success' | 'bg-info' | 'bg-warning' | 'bg-danger';

    if (value < 25) {
      type = 'bg-success';
    } else if (value < 50) {
      type = 'bg-info';
    } else if (value < 75) {
      type = 'bg-warning';
    } else {
      type = 'bg-danger';
    }

    this.dynamic = value;
    this.type = type;
  }

  toggleShareItemActive(): void {
    this.isShareItemActive = !this.isShareItemActive;
  }

  getQuota() {
    let quota = new SizeConverterPipe().transform(this.quota)
    return this.quota === 0 ? null : ` \\ ${quota}`
  }
}
