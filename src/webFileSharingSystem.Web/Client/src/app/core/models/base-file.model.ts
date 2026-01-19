import { PartialFileInfo } from './partial-file-info.model';

export interface BaseFile {
  id: number;
  parentId: number | null;
  fileName: string;
  mimeType: string | null;
  size: number;
  isDirectory: boolean;
  fileStatus: FileStatus;

  // Upload related properties
  progressStatus: ProgressStatus | null;
  partialFileInfo: PartialFileInfo | null;
  uploadProgress: number | null;
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

