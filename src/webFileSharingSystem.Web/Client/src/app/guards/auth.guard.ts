import { Injectable } from '@angular/core';
import { ActivatedRouteSnapshot, CanActivate, RouterStateSnapshot, UrlTree } from '@angular/router';
import { Observable } from 'rxjs';
import { Router } from '@angular/router';
import { AuthenticationService } from "../services/authentication.service";
import {JwtTokenService} from "../services/jwt-token.service";

@Injectable({
  providedIn: 'root'
})
export class AuthGuard implements CanActivate {
  constructor(private router: Router,
              private authenticationService: AuthenticationService,
              private jwtService: JwtTokenService) {
  }
  canActivate(
    route: ActivatedRouteSnapshot,
    state: RouterStateSnapshot): boolean {

    const user = this.authenticationService.currentUserValue;
    if (user) {
      if(this.jwtService.isTokenExpired()) {
        this.authenticationService.logout();
        this.router.navigate(['/login'], { queryParams: { returnUrl: state.url }});
        return false;
      }
      // check if route is restricted by role
      if (route.data.roles && !route.data.roles.some((r:string) => user.roles.includes(r))) {
        // role not authorized so redirect to home page
        this.router.navigate(['/']);
        return false;
      }

      // authorized so return true
      return true;
    }

    // not logged in so redirect to login page with the return url
    this.router.navigate(['/login'], { queryParams: { returnUrl: state.url }});
    return false;
  }

}
