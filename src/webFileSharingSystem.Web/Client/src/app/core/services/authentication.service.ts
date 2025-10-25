import { computed, inject, Injectable, signal } from '@angular/core';
import { User } from '../models/user.model';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { catchError, finalize, map } from 'rxjs';
import { JwtTokenService } from './jwt-token.service';
import { environment } from '../../../environments/environment';
import { Router } from '@angular/router';
import { LocalStorageManagementService } from './local-storage-management.service';

@Injectable({
  providedIn: 'root'
})
export class AuthenticationService {
  private readonly authUrl = `${environment.apiUrl}/Auth`;
  private http = inject(HttpClient);
  private jwtService = inject(JwtTokenService);
  private localStorageManager = inject(LocalStorageManagementService);
  private router = inject(Router);
  private _currentUser = signal<User | null>(null);
  readonly currentUser = this._currentUser.asReadonly();
  readonly isAuthenticated = computed(() => !!this._currentUser());


  constructor() {
    this.initializeCurrentUser();
  }

  private initializeCurrentUser() {
    const user = this.localStorageManager.getUser();
    if (!user) return;
    this._currentUser.set(user);
    this.jwtService.setToken(this.currentUser()!.token);
  }

  register(registerRequest: { username: string, password: string, email: string | null }) {
    if (registerRequest.email === '') registerRequest.email = null;
    return this.http.post<any>(`${this.authUrl}/Register`, registerRequest);
  }

  login(username: string, password: string) {
    return this.http.post<any>(`${this.authUrl}/Login`, { username, password }, { withCredentials: true })
      .pipe(map(response => this.handleLogInResponse(response)));
  }

  loginWithGoogle(credentials: string) {
    const header = new HttpHeaders().set('Content-type', 'application/json');
    return this.http.post<any>(`${this.authUrl}/LoginWithGoogle`, JSON.stringify(credentials), {
      headers: header,
      withCredentials: true
    }).pipe(map(response => this.handleLogInResponse(response)));
  }

  private handleLogInResponse(response: any) {
    let user = <User>response.user;
    user.token = response.tokens.token;

    this.jwtService.setTokenAndUpdateUserInfo(user);
    this.localStorageManager.saveUser(user);
    this._currentUser.set(user);
    return user;
  }

  refreshToken() {
    let user = this.currentUser()!;

    return this.http.post<any>(`${this.authUrl}/Refresh`, { token: user.token }, { withCredentials: true })
      .pipe(map(tokens => {
        this.jwtService.setToken(tokens.token);
        this.jwtService.updateUserInfo(user);
        this.localStorageManager.saveUser(user);
        this._currentUser.set(user);
        return user.token;
      }), catchError(error => {
        this.removeUser();
        this.router.navigate(['/login']);
        return error(error);
      }));
  }

  logout() {
    return this.http.put<any>(`${environment.apiUrl}/Auth/Revoke`, {}, { withCredentials: true }).pipe(
      finalize(() => this.removeUser())
    );
  }

  private removeUser() {
    this.localStorageManager.removeUser();
    this._currentUser.set(null);
  }

  updateCurrentUserUsedSpace(difference: number): void {
    if (!this._currentUser()) return;
    this._currentUser.update(user => ({ ...user, usedSpace: user!.usedSpace + difference } as User));
    localStorage.setItem('currentUser', JSON.stringify(this._currentUser()));
  }
}
