import { BaseFile } from './base-file.model';

export interface AppFile extends BaseFile {
  isFavourite: boolean;
  isShared: boolean;
  modificationDate: Date;
  uploadProgress: number;
  stopping: boolean;
}

