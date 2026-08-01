import { ShareAccessMode } from './share-access-mode.model';

export interface UpdateFileShareRequest {
  AccessMode: ShareAccessMode;
  ShareValidTo?: Date;
}
