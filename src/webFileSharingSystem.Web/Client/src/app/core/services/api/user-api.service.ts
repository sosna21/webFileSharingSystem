import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../../../environments/environment';
import { AppUserResponse } from '../../models/app-user-response.model';

@Injectable({
  providedIn: 'root',
})
export class UserApiService {
  private readonly userUrl = `${environment.apiUrl}/User`;
  private readonly http = inject(HttpClient);

  getMe(): Observable<AppUserResponse> {
    return this.http.get<AppUserResponse>(`${this.userUrl}/Me`);
  }

  uploadMyPhoto(file: File) {
    const formData = new FormData();
    formData.append('Photo', file);
    return this.http.put(`${this.userUrl}/Me/Photo`, formData);
  }

  deleteMyPhoto() {
    return this.http.delete(`${this.userUrl}/Me/Photo`);
  }

  getUserPhoto(photoUrl: string): Observable<Blob> {
    return this.http.get(photoUrl, {
      responseType: 'blob',
    });
  }
}
