import { BaseFile } from './base-file.model';

export interface AppFile extends BaseFile {
  isFavourite: boolean;
  isShared: boolean;
  sharedUntil: string | null;
  modificationDate: string;
}
