import { SharedFile } from './shared-file.model';

export interface SharedFileResponse {
  items: SharedFile[];
  pageIndex: number;
  totalPages: number;
  totalCount: number;
}
