export interface BaseFile {
  id: number;
  parentId: number | null;
  fileName: string;
  mimeType: string | null;
  size: number;
  isDirectory: boolean;
}
