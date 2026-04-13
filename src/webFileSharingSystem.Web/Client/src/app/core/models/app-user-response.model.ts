export interface AppUserResponse {
  id: number;
  userName: string | null;
  emailAddress: string | null;
  usedSpace: number;
  quota: number;
  photoUrl: string | null;
  photoMimeType: string | null;
  photoSize: number | null;
  photoUpdatedAt: string | null;
}
