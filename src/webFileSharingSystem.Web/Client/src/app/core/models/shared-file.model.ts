import { BaseFile } from './base-file.model';
import { ShareAccessMode } from './share-access-mode.model';

export interface SharedFile extends BaseFile {
  userId: number;
  shareId: number | null;
  sharedUserName: string;
  accessMode: ShareAccessMode;
  validUntil: string | null;
}
