import { ShareAccessMode } from "./share-access-mode.model";

export interface AddShareRequest {
  UserNameToShareWith: string,
  AccessMode: ShareAccessMode,
  ShareValidTo?: Date,
}
