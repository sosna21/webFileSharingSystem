import { BaseFile } from './base-file.model';

export interface SharedFile extends BaseFile {
  userId: number;

  shareId: number | null;
  sharedUserName: string;
  sharedUserPhotoUrl: string | null;
}
