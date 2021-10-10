export interface UploadProgressInfo {
  status: UploadStatus,
  parentId?: number | null,
  fileId: number,
  progress: number
}

export enum UploadStatus {
  Started,
  InProgress,
  Completed
}
