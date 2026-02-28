import { BaseFile } from './base-file.model';

export interface AppFile extends BaseFile {
  isFavourite: boolean;
  isShared: boolean;
  modificationDate: string;
  uploadProgress: number;
  stopping: boolean;
}
