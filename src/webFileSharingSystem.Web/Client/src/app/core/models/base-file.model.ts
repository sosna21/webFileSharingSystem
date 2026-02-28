import { PartialFileInfo } from './partial-file-info.model';
import { ShareAccessMode } from './share-access-mode.model';

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

  // UI only properties
  // need them in app file model to avoid casting
  accessMode?: ShareAccessMode;
  validUntil?: string;
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
