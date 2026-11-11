import { AppFile } from '../../core/models/app-file.model';

export type UserFilesContextMenuRequest = {
  event: PointerEvent;
  file?: AppFile;
};

export type UserFilesDirectoryMenuRequest = {
  event: PointerEvent;
};

export type UserFilesOperation =
  | { type: 'open-folder'; file: AppFile }
  | { type: 'open-location'; file: AppFile }
  | { type: 'rename'; file: AppFile }
  | { type: 'rename-inline'; file: AppFile; name: string }
  | { type: 'toggle-favourite'; files: AppFile[]; value: boolean }
  | { type: 'delete'; files: AppFile[] }
  | { type: 'share'; files: AppFile[] }
  | { type: 'manage-shares'; file: AppFile }
  | { type: 'move'; files: AppFile[] }
  | { type: 'copy'; files: AppFile[] }
  | { type: 'download'; files: AppFile[] }
  | { type: 'generate-link'; files: AppFile[] }
  | { type: 'pause-upload'; files: AppFile[] }
  | { type: 'resume-upload'; files: AppFile[] }
  | { type: 'cancel-upload'; files: AppFile[] }
  | { type: 'sort'; column: string };
