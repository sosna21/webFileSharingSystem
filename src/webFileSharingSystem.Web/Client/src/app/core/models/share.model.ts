import { ShareAccessMode } from './share-access-mode.model';

export interface Share {
  shareId: number;
  sharedWithUserName: string;
  accessMode: ShareAccessMode;
  validUntil: string | null;
}
