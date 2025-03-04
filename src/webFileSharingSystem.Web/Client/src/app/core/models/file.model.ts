import { PartialFileInfo } from "./partial-file-info.model";

export interface AppFile {
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
  checked: boolean;
  rename: boolean;
  stopping: boolean;
  progressStatus: ProgressStatus;
  loading: boolean
}

export enum FileStatus {
  Completed,
  Incomplete
}

export enum ProgressStatus {
  Started,
  Stopping,
  Stopped,
}
