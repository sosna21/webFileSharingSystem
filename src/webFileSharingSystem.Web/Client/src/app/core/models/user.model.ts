export interface User {
  id: number;
  userName: string;
  email: string;
  token: string;
  roles: string[];
  photoUrl: string | null;
  photoMimeType: string | null;
  photoSize: number | null;
  photoUpdatedAt: string | null;
}
