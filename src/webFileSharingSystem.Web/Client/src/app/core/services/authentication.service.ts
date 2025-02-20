import { inject, Injectable, signal } from '@angular/core';
import { User } from '../models/user.model';
import { Router } from '@angular/router';

@Injectable({
  providedIn: 'root'
})
export class AuthenticationService {
  private router = inject(Router);
  private _currentUser = signal<User | null>(null);
  currentUser = this._currentUser.asReadonly();
  isAuthenticated = signal(true);// computed(() => !!this.currentUser()); //TODO uncomment

  logout() {
    this._currentUser.set(null);
    this.isAuthenticated.set(false); //TODO remove, will be calc form currentUser
    this.router.navigate(['/login']);
  }
}
