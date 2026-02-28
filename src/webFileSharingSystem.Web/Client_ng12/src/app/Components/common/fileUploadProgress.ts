export interface UploadProgressInfo {
  status: UploadStatus,
  parentId?: number | null,
  fileId: number | null,
  progress: number | null
}

export enum UploadStatus {
  Started,
  InProgress,
  Stopping,
  Stopped,
  Resumed,
  Completed,
}
