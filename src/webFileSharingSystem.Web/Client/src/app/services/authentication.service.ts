import {Injectable} from '@angular/core';
import {HttpClient} from '@angular/common/http';
import {BehaviorSubject, Observable} from 'rxjs';
import {map} from 'rxjs/operators';
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
        this.jwtService.setTokenAndUpdateUserInfo(response.user);
        localStorage.setItem('currentUser', JSON.stringify(response.user));
        this.currentUserSubject.next(response.user);
        return response.user;
      }));
  }

  register(registerRequest: { username: string, password: string, email: string | null }) {
    if (registerRequest.email === '') registerRequest.email = null;
    return this.http.post<any>(`${environment.apiUrl}/Auth/Register`, registerRequest);
  }

  logout() {
    // remove user from local storage to log user out
    localStorage.removeItem('currentUser');
    this.currentUserSubject.next(undefined!);
  }
}
