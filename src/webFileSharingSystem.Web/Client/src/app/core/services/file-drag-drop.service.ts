import { inject, Injectable, signal } from '@angular/core';
import { AppFile } from '../models/app-file.model';
import { MessageSeverity } from '../models/toast-info.model';
import { FileService } from './file.service';
import { ToastService } from './toast.service';

@Injectable({
  providedIn: 'root'
})
export class FileDragDropService {
  private readonly fileService = inject(FileService);
  private readonly toast = inject(ToastService);
  private readonly baseFiles = this.fileService.files;

  readonly dragOverTarget = signal<{ type: 'file' | 'breadcrumb'; id: number | null } | null>(null);
  readonly draggedFiles = signal<AppFile[]>([]);

  startDrag(files: AppFile[]) {
    this.draggedFiles.set(files);
  }

  clearDrag() {
    this.dragOverTarget.set(null);
    this.draggedFiles.set([]);
  }

  moveFiles(targetDirId: number | null, targetDirName: string) {
    const filesToMove = this.draggedFiles();
    this.clearDrag();
    if (filesToMove.length === 0) return;

    filesToMove.forEach(file => this.updateFile(file, { loading: true }));

    this.fileService.moveFiles(filesToMove, targetDirId).subscribe({
      next: () => {
        const filesToMoveIds = filesToMove.map(f => f.id);
        //remove moved files from fileList
        this.baseFiles.update(files => files.filter(f => !filesToMoveIds.includes(f.id)));

        this.toast.show(
          filesToMove.length === 1 ? 'File moved' : 'Files moved',
          filesToMove.length === 1
            ? `Moved '${filesToMove[0].fileName}' to '${targetDirName}'`
            : `Moved ${filesToMove.length} file(s) to '${targetDirName}'`,
          MessageSeverity.success
        );
      },
      error: (err) => {
        filesToMove.forEach(f => this.updateFile(f, { loading: false }));

        let errorMessage = 'File move failed. Please try again.';
        if (err.error?.errors) {
          errorMessage = Object.values(err.error.errors).flat().join(' ');
        } else if (err.error?.title) {
          errorMessage = err.error.title;
        }

        this.toast.show('File move failed', errorMessage, MessageSeverity.error);
      }
    });
  }

  private updateFile(file: AppFile, partialUpdate?: Partial<AppFile>) {
    this.baseFiles.update(files => files.map(f => f.id === file.id ? { ...f, ...partialUpdate } : f));
  }

  /**
 * Check if DataTransfer contains app files
 */
  allowAppFiles(event: DragEvent): boolean {
    return event.dataTransfer?.types.includes('application/json') ?? false;
  }

  /**
   * Set drop effect according to allowed files
   */
  setDropEffect(event: DragEvent, allowed: boolean): void {
    if (!event.dataTransfer) return;
    event.dataTransfer.dropEffect = allowed ? 'move' : 'none';
  }

  /**
   * Mark the current drag over target
   */
  setDragOverTarget(type: 'file' | 'breadcrumb', id: number | null): void {
    this.dragOverTarget.set({ type, id });
  }

  /**
   * Reset drag over state
   */
  clearDragOverTarget(): void {
    this.dragOverTarget.set(null);
  }
}
