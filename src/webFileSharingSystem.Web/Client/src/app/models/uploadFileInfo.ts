export interface UploadFileInfo {
    fileName: string;
    mimeType: string;
    size: number;
    lastModificationDate: Date;
    parentId: number | null;
}
