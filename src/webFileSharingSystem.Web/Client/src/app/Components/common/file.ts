export interface File {
  id: number;
  fileName: string;
  mimeType?: string;
  size: number;
  isFavourite: boolean;
  isShared: boolean
  isDirectory: boolean;
  modificationDate: Date;

  checked: boolean;
  rename: boolean;
  isCompleted: boolean;
  stopped: boolean;
}
