import { SharedFile } from '../../core/models/shared-file.model';

export type SharedFilesContextMenuRequest = {
  event: PointerEvent;
  file?: SharedFile;
};

export type SharedFilesDirectoryMenuRequest = {
  event: PointerEvent;
};

export type SharedFilesOperation =
  | { type: 'open-folder'; file: SharedFile }
  | { type: 'open-location'; file: SharedFile }
  | { type: 'rename'; file: SharedFile }
  | { type: 'rename-inline'; file: SharedFile; name: string }
  | { type: 'delete'; files: SharedFile[] }
  | { type: 'move'; files: SharedFile[] }
  | { type: 'copy'; files: SharedFile[] }
  | { type: 'download'; files: SharedFile[] }
  | { type: 'pause-upload'; files: SharedFile[] }
  | { type: 'resume-upload'; files: SharedFile[] }
  | { type: 'cancel-upload'; files: SharedFile[] }
  | { type: 'sort'; column: string };
