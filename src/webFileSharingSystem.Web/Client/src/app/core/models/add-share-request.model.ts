export interface AddShareRequest {
  UserNameToShareWith?: string,
  AccessMode?: ShareAccessMode,
  AccessDuration?: any,
  Update?: boolean
}

export enum ShareAccessMode {
  ReadOnly,
  ReadWrite,
  FullAccess,
}
