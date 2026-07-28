import { Injectable } from '@angular/core';
import { DBkeys } from './storage-kays';
import { User } from '../models/user.model';
import { ThemeMode, ViewMode } from './state.service';

@Injectable({
  providedIn: 'root',
})
export class LocalStorageManagementService {
  public clearAllStorage() {
    localStorage.clear();
  }

  public removeFromStorage(key: string) {
    localStorage.removeItem(key);
  }

  public getUser(): User | null {
    return this.getItem(DBkeys.CURRENT_USER);
  }

  public saveUser(user: User) {
    this.setItem(DBkeys.CURRENT_USER, user);
  }

  public removeUser() {
    this.removeFromStorage(DBkeys.CURRENT_USER);
  }

  public getTheme(): ThemeMode | null {
    return this.getItem(DBkeys.THEME);
  }

  public saveTheme(theme: ThemeMode) {
    this.setItem(DBkeys.THEME, theme);
  }

  public getViewMode(): ViewMode | null {
    return this.getItem(DBkeys.VIEW_MODE);
  }

  public saveViewMode(viewMode: ViewMode) {
    this.setItem(DBkeys.VIEW_MODE, viewMode);
  }

  private setItem(key: string, data: unknown) {
    localStorage.setItem(key, JSON.stringify(data));
  }

  private getItem(key: string) {
    const item = localStorage.getItem(key);

    if (item === null) return null;

    return JSON.parse(item);
  }
}
