import { Injectable } from '@angular/core';
import { User } from '../models/user.model';
import { Buffer } from 'buffer';

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
      this.decodedToken = JSON.parse(Buffer.from(base64Url, 'base64').toString());
    }
    return;
  }
}
