import { BaseFile } from './base-file.model';
import { PartialFileInfo } from './partial-file-info.model';

export interface AppFile extends BaseFile {
  isFavourite: boolean;
  isShared: boolean;
  modificationDate: Date;
  fileStatus: FileStatus;
  uploadProgress: number;
  partialFileInfo?: PartialFileInfo;
  stopping: boolean;
  progressStatus: ProgressStatus;
}

export enum FileStatus {
  Completed,
  Incomplete,
}

export enum ProgressStatus {
  Started,
  Stopping,
  Stopped,
}
