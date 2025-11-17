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
  stopping: boolean;
  progressStatus: ProgressStatus;
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
