import {PartialFileInfo} from "../../models/partialFileInfo";
import {FileStatus, ProgressStatus} from "./file";

export interface SharedFile {
  id: number;
  fileName: string;
  mimeType?: string;
  size: number;
  isFavourite: boolean;
  isShared: boolean
  isDirectory: boolean;
  modificationDate: Date;
  fileStatus: FileStatus;
  uploadProgress: number;
  partialFileInfo?: PartialFileInfo;
  accessMode: AccessMode;
  validUntil: Date;
  sharedUserName: string;

  checked: boolean;
  rename: boolean;
  stopping: boolean;
  progressStatus: ProgressStatus;
  loading: boolean
}

export enum AccessMode {
  ReadOnly,
  ReadWrite,
  FullAccess,
}


