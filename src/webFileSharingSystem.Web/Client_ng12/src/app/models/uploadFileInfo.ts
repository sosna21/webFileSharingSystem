export interface UploadFileInfo {
  fileName: string;
  mimeType: string | null;
  size: number;
  lastModificationDate: Date;
  parentId: number | null;
}
