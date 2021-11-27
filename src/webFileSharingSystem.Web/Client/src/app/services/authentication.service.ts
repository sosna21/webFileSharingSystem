import {Injectable} from '@angular/core';
import {HttpClient} from '@angular/common/http';
import {BehaviorSubject, Observable, throwError} from 'rxjs';
import {catchError, map} from 'rxjs/operators';
import {User} from '../models/user';
import {JwtTokenService} from "./jwt-token.service";
import {environment} from "../../environments/environment";


@Injectable({providedIn: 'root'})
export class AuthenticationService {
  private currentUserSubject: BehaviorSubject<User>;
  public currentUser: Observable<User>;

  constructor(private http: HttpClient, private jwtService: JwtTokenService) {
    this.currentUserSubject = new BehaviorSubject<User>(JSON.parse(localStorage.getItem('currentUser')!));
    this.currentUser = this.currentUserSubject.asObservable();
    this.currentUser.subscribe(u => jwtService.setToken(u?.token));
  }

  public get currentUserValue(): User {
    return this.currentUserSubject.value;
  }

  public updateCurrentUserUsedSpace(difference: number): void {
    const user = this.currentUserSubject.value
    user.usedSpace += difference;
    localStorage.setItem('currentUser', JSON.stringify(user));
    this.currentUserSubject.next(user);
  }

  login(username: string, password: string) {
    return this.http.post<any>(`${environment.apiUrl}/Auth/Login`, {username, password})
      .pipe(map(response => {
        // store user details and basic auth credentials in local storage to keep user logged in between page refreshes
        let user = <User>response.user;
        user.token = response.tokens.token;

        this.jwtService.setTokenAndUpdateUserInfo(user);
        localStorage.setItem('currentUser', JSON.stringify(user));
        this.currentUserSubject.next(user);
        return user;
      }));
  }

  register(registerRequest: { username: string, password: string, email: string | null }) {
    if (registerRequest.email === '') registerRequest.email = null;
    return this.http.post<any>(`${environment.apiUrl}/Auth/Register`, registerRequest);
  }

  logout() {
    return this.http.put<any>(`${environment.apiUrl}/Auth/Revoke`, {}).pipe(map(
    () => {
      localStorage.removeItem('currentUser');
      this.currentUserSubject.next(undefined!);
    }), catchError( error => {
      localStorage.removeItem('currentUser');
      this.currentUserSubject.next(undefined!);
      return throwError(error);
    }));
  }

  refreshToken() {
    let user = this.currentUserSubject.value;
    return this.http.post<any>(`${environment.apiUrl}/Auth/Refresh`, { token: user.token })
      .pipe(map(tokens => {
        // update basic auth credentials and store in local storage
        this.jwtService.setToken(tokens.token)
        this.jwtService.updateUserInfo(user);
        localStorage.setItem('currentUser', JSON.stringify(user));
        this.currentUserSubject.next(user);
        return user.token;
      }), catchError( error => {
        localStorage.removeItem('currentUser');
        this.currentUserSubject.next(undefined!);
        return throwError(error);
      }));
  }
}
