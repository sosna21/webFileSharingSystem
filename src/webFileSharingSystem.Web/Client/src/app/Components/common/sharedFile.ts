import {File} from "./file";

export interface SharedFile extends File {
  shareId?: number;
  accessMode: AccessMode;
  validUntil: Date;
  sharedUserName: string;
}

export enum AccessMode {
  ReadOnly,
  ReadWrite,
  FullAccess,
}


