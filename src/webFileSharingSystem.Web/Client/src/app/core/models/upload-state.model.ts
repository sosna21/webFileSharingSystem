import { FileStatus } from './base-file.model';

export interface UploadStateDto {
  fileId: number;
  persistenceMap: Uint8Array;
  uploadProgress: number;
  status: FileStatus;
}
