import { Injectable } from '@angular/core';
import { User } from '../models/user.model';

@Injectable({
  providedIn: 'root'
})
export class JwtTokenService {
  private token?: string;
  private decodedToken?: { [key: string]: string };

  public setTokenAndUpdateUserInfo(user: User) {
    this.setToken(user.token);
    this.updateUserInfo(user);
  }

  public setToken(token: string) {
    if (token) {
      this.token = token;
    }
  }

  public clearToken() {
    this.token = undefined;
    this.decodedToken = undefined;
  }

  public updateUserInfo(user: User) {
    this.decodeToken();

    if (!this.decodedToken) {
      return;
    }

    if (user.id !== +this.decodedToken['nameid']) {
      throw new Error('Token is invalid');
    }

    user.roles = [];
    const roles = this.decodedToken['role'];
    Array.isArray(roles) ? user.roles = roles : user.roles.push(roles);
    user.token = this.token!;
  }

  public isTokenExpired(): boolean {
    const expiryTime: number | null = this.getExpiryTime();
    if (expiryTime) {
      return ((1000 * expiryTime) - (new Date()).getTime()) < 5000;
    } else {
      return false;
    }
  }

  private getExpiryTime(): number | null {
    this.decodeToken();
    return this.decodedToken ? +this.decodedToken['exp'] : null;
  }

  private decodeToken() {
    if (this.token) {
      const base64Url = this.token.split('.')[1];
      const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
      const jsonPayload = decodeURIComponent(atob(base64).split('').map((c) =>
        '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2)
      ).join(''));

      this.decodedToken = JSON.parse(jsonPayload);
    }
  }
}
