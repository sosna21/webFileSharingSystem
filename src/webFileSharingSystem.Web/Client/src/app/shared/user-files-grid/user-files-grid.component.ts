import { CommonModule } from '@angular/common';
import {
  ChangeDetectorRef,
  Component,
  computed,
  ElementRef,
  effect,
  inject,
  TrackByFunction,
  viewChild,
  viewChildren,
  output,
} from '@angular/core';
import { AppFile } from '../../core/models/app-file.model';
import { FileStatus, ProgressStatus } from '../../core/models/base-file.model';
import { AuthenticationService } from '../../core/services/authentication.service';
import { DragDropService } from '../../core/services/drag-drop.service';
import { FileService } from '../../core/services/file.service';
import { GridSelectionService } from '../../core/services/grid-selection.service';
import { SelectionService } from '../../core/services/selection.service';
import { UserFileGridCardComponent } from './user-file-grid-card/user-file-grid-card.component';
import { DragPreviewComponent } from '../drag-preview/drag-preview.component';
import { CdkTableModule } from '@angular/cdk/table';
import {
  NgbTooltipModule,
  NgbDropdownModule,
  NgbTooltip,
} from '@ng-bootstrap/ng-bootstrap';
import { FileUploadService } from '../../core/services/file-upload.service';
import { ModalService } from '../../core/services/modal.service';
import { generateUniqueDirName } from '../../core/utils/file-utils';
import { StateService } from '../../core/services/state.service';
import { SelectionAreaComponent } from '../selection-area/selection-area.component';
import { MobileFileActionsComponent } from '../mobile-file-actions/mobile-file-actions.component';
import {
  UserFilesContextMenuRequest,
  UserFilesDirectoryMenuRequest,
  UserFilesOperation,
} from '../user-files-view/user-files-view.types';

@Component({
  selector: 'app-user-files-grid',
  imports: [
    CommonModule,
    UserFileGridCardComponent,
    DragPreviewComponent,
    CommonModule,
    NgbTooltipModule,
    NgbDropdownModule,
    DragPreviewComponent,
    CdkTableModule,
    SelectionAreaComponent,
    MobileFileActionsComponent,
  ],
  providers: [GridSelectionService<AppFile>],
  templateUrl: './user-files-grid.component.html',
  styleUrl: './user-files-grid.component.scss',
  host: {
    class: 'd-block h-100',
    '(window:keydown)': 'onKeydown($event)',
    '(window:pointermove)': 'onRubberBandPointerMove($event)',
    '(window:pointerup)': 'onRubberBandPointerUp($event)',
    '(window:pointercancel)': 'onRubberBandPointerCancel($event)',
  },
})
export class UserFilesGridComponent {
  readonly FileStatus = FileStatus;
  readonly ProgressStatus = ProgressStatus;
  private readonly fileService = inject(FileService);
  private readonly uploadService = inject(FileUploadService);
  private readonly modalService = inject(ModalService);
  private readonly authService = inject(AuthenticationService);
  private readonly selection = inject(SelectionService<AppFile>);
  private readonly gridSelection = inject(GridSelectionService<AppFile>);
  private readonly dragFacade = inject(DragDropService<AppFile>);
  private readonly changeDetectorRef = inject(ChangeDetectorRef);
  readonly editingId = this.fileService.editingId;
  readonly loadingIds = this.fileService.loadingIds;
  readonly canPaste = computed(() => !!this.fileService.awaitingActionState());
  readonly sortOption = this.fileService.sortOption;
  readonly currentDirectoryAccessMode = computed(
    () => this.fileService.parentBreadcrumb()?.accessMode,
  );
  readonly viewMode = inject(StateService).viewMode;
  readonly rubberBandItemSelector =
    'app-user-file-grid-card, app-shared-file-grid-card';
  readonly fileContextMenuRequested = output<UserFilesContextMenuRequest>();
  readonly directoryContextMenuRequested =
    output<UserFilesDirectoryMenuRequest>();
  readonly selectionInteractionStarted = output();
  readonly operationRequested = output<UserFilesOperation>();

  constructor() {
    this.selection.setScrollContainer(this.scrollContainer);
    effect(() => {
      this.fileService.parentId();
      this.scrollContainer()?.nativeElement.scrollTo({ top: 0 });
    });
  }

  toggleSort(column: string) {
    this.operationRequested.emit({ type: 'sort', column });
  }

  sortableColumns = computed(() => [
    { column: 'fileName', displayName: $localize`File name` },
    { column: 'favourite', displayName: $localize`Favourite` },
    { column: 'share', displayName: $localize`Share` },
    { column: 'size', displayName: $localize`Size` },
    { column: 'createdByUserName', displayName: $localize`Created By` },
    { column: 'lastModification', displayName: $localize`Last Modification` },
  ]);

  files = this.fileService.userFiles;
  selectedIds = this.selection.selectedIds;
  selectedFiles = this.selection.selectedItems;
  filesMarkedForAction = this.fileService.awaitingActionState;
  areAllCheckboxesChecked = computed(
    () =>
      this.files().length > 0 &&
      this.selectedIds().size === this.files().length,
  );
  currentUserId = computed(() => this.authService.currentUser()?.id);

  tooltips = viewChildren(NgbTooltip);
  scrollContainer = viewChild<ElementRef<HTMLElement>>('scrollContainer');

  currentDirectoryId = this.fileService.parentId;
  trackByFileId: TrackByFunction<AppFile> = (_, file) => file.id;

  isSelected(id: number): boolean {
    return this.selection.isSelected(id);
  }

  async openLocation(file: AppFile) {
    this.fileService.goToFolder(file.parentId);
    await this.fileService.waitForNextCurrentReload();
    this.selection.scrollToId(file.id);
  }

  isEditing(id: number): boolean {
    return this.editingId() === id;
  }

  isLoading(id: number): boolean {
    return this.loadingIds().has(id);
  }

  onKeydown(event: KeyboardEvent) {
    const target = event.target as HTMLElement;
    if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA') return;

    if (
      (event.ctrlKey || event.metaKey) &&
      event.shiftKey &&
      event.key.toLowerCase() === 'n'
    ) {
      event.preventDefault();
      this.createFolder();
      return;
    }

    if (event.key === 'F2') {
      event.preventDefault();
      const selected = this.selectedFiles();
      if (selected.length === 1) {
        this.renameFile(selected[0] as AppFile);
      }
      return;
    }

    if (event.key === 'Delete') {
      event.preventDefault();
      const selected = this.selectedFiles();
      if (selected.length > 0) {
        this.deleteFiles(selected as AppFile[]);
      }
      return;
    }

    if (event.key === 'Enter') {
      const selected = this.selectedFiles() as AppFile[];
      if (selected.length === 1 && selected[0].isDirectory) {
        event.preventDefault();
        this.selectFolder(selected[0].id);
      }
      return;
    }

    this.gridSelection.onKeydown(event, this.files, this.scrollContainer);
  }

  onRubberBandPointerDown(event: PointerEvent) {
    const container = this.scrollContainer()?.nativeElement;
    if (!container) return;

    const started = this.selection.beginRubberBandSelection(
      event,
      container,
      this.rubberBandItemSelector,
    );

    if (started) {
      event.preventDefault();
      this.selectionInteractionStarted.emit();
      (document.activeElement as HTMLElement | null)?.blur();
    }
  }

  onRubberBandPointerMove(event: PointerEvent) {
    this.selection.handlePointerMove(
      event,
      this.getFileIdAtPointer(event),
      (clientX, clientY) => this.getFileIdAtPoint(clientX, clientY),
    );
  }

  private getFileIdAtPointer(event: PointerEvent) {
    return this.getFileIdAtPoint(event.clientX, event.clientY);
  }

  private getFileIdAtPoint(clientX: number, clientY: number) {
    const element = document
      .elementFromPoint(clientX, clientY)
      ?.closest<HTMLElement>('[data-file-id]');
    const fileId = element?.dataset['fileId'];
    return fileId === undefined ? undefined : Number(fileId);
  }

  onRubberBandScroll() {
    this.selection.updateRubberBandSelection();
  }

  onRubberBandPointerUp(event: PointerEvent) {
    this.selection.handlePointerUp(event);
  }

  onRubberBandPointerCancel(event: PointerEvent) {
    this.selection.handlePointerCancel(event);
  }

  checkAllCheckBox(ev: Event) {
    const target = ev.target as HTMLInputElement;
    this.selection.toggleAll(target.checked);
  }

  onFilePointerDown(file: AppFile, event: PointerEvent) {
    this.selectionInteractionStarted.emit();
    this.selection.handleFilePointerDown(event, file, (clientX, clientY) =>
      this.getFileIdAtPoint(clientX, clientY),
    );
  }

  selectFile(file: AppFile, event: MouseEvent) {
    this.selection.handleClick(file, event);
  }

  viewWrapperClick(event: PointerEvent) {
    const target = event.target as HTMLElement;

    if (
      !target.closest('app-user-file-grid-card') &&
      !this.selection.rubberBandActive() &&
      event.ctrlKey === false &&
      event.shiftKey === false
    ) {
      this.selection.clear();
    }
  }

  selectFolder(folderId: number) {
    this.fileService.goToFolder(folderId);
  }

  // Rename file
  async renameFile(file: AppFile) {
    this.operationRequested.emit({ type: 'rename', file });
  }

  changeFavourite(files: AppFile[], changeTo: boolean) {
    this.operationRequested.emit({
      type: 'toggle-favourite',
      files,
      value: changeTo,
    });
    this.tooltips().forEach((t) => t.close());
  }

  downloadFiles(files: AppFile[]) {
    this.operationRequested.emit({ type: 'download', files });
  }

  async generateShareLink(files: AppFile[]) {
    this.operationRequested.emit({ type: 'generate-link', files });
  }

  showShareManagementModal(sharedFile: AppFile) {
    this.operationRequested.emit({ type: 'manage-shares', file: sharedFile });
  }

  shareFile(files: AppFile[]) {
    this.operationRequested.emit({ type: 'share', files });
  }

  contextMenuClick(event: PointerEvent, file: AppFile) {
    event.preventDefault();
    event.stopPropagation();
    if (event.pointerType != 'mouse') return;

    if (file && !this.selectedFiles().includes(file)) {
      this.selectedIds.set(new Set([file.id]));
    }
    this.fileContextMenuRequested.emit({ event, file });
  }

  tableContextMenuClick(event: PointerEvent) {
    event.preventDefault();
    event.stopPropagation();
    if ('pointerType' in event && event.pointerType !== 'mouse') {
      return;
    }

    this.directoryContextMenuRequested.emit({ event });
  }

  actionIconClick(event: MouseEvent, file: AppFile) {
    event.stopPropagation();

    this.selectedIds.set(new Set([file.id]));
    this.fileContextMenuRequested.emit({
      event: new PointerEvent('contextmenu', {
        clientX: (event.target as HTMLElement).getBoundingClientRect().right,
        clientY: (event.target as HTMLElement).getBoundingClientRect().bottom,
        pointerType: 'mouse',
      }),
      file,
    });
  }

  pasteFiles() {
    this.fileService.pasteFilesWithFeedback((ids) => {
      this.selection.selectedIds.set(ids);
      if (ids.size > 0) {
        this.selection.scrollToId(Array.from(ids).pop()!);
      }
    });
  }

  uploadFiles($event: File[]) {
    const filesWithPath: { file: File; path: string }[] = $event.map(
      (file) => ({
        file: file,
        path: '',
      }),
    );
    this.uploadService
      .uploadFiles([], filesWithPath, this.fileService.parentId())
      .subscribe();
  }

  async createFolder() {
    const newDirName = await this.modalService.getNewDirectoryName({
      startName: generateUniqueDirName(this.fileService.names()),
      blacklistedNames: this.fileService.names(),
    });

    if (!newDirName) return;

    this.fileService.createDirectoryWithFeedback(newDirName, (id) => {
      this.selection.selectedIds.set(new Set([id]));
      this.selection.scrollToId(id);
    });
  }

  deleteFiles(files: AppFile[]) {
    this.operationRequested.emit({ type: 'delete', files });
  }

  initFileMove(files: AppFile[]) {
    this.operationRequested.emit({ type: 'move', files });
  }

  initFileCopy(files: AppFile[]) {
    this.operationRequested.emit({ type: 'copy', files });
  }

  // Drag and drop logic for moving and uploading files
  private readonly fileMoveDragPreview = viewChild(DragPreviewComponent, {
    read: ElementRef,
  });

  readonly dragTarget = this.dragFacade.dragTarget;
  readonly dragPayloadNb = this.dragFacade.filesNb;
  readonly isHoverTargetATable = this.dragFacade.isHoverTargetATable;
  readonly touchDragDisabled = this.selection.touchDragDisabled;
  readonly touchMultiSelectionActive =
    this.selection.isTouchMultiSelectionActive;

  canBeTargetDirectory(file: AppFile) {
    return file.isDirectory && !this.isSelected(file.id);
  }

  onRowDragStart(event: DragEvent, file: AppFile) {
    if (this.selection.isTouchRangeSelectionActive()) {
      event.preventDefault();
      event.stopPropagation();
      return;
    }

    if (!this.isSelected(file.id)) {
      this.selection.selectedIds.set(new Set([file.id]));
      this.changeDetectorRef.detectChanges();
    }
    const previewEl = this.fileMoveDragPreview()?.nativeElement
      .firstElementChild as HTMLElement | null;
    this.dragFacade.rowDragStart(event, file, this.selectedFiles(), previewEl);
  }

  onRowDragEnter(event: DragEvent, row: AppFile) {
    this.dragFacade.rowDragEnter(event, row);
  }

  onRowDragOver(event: DragEvent) {
    this.dragFacade.rowDragOver(event);
  }

  onRowDragLeave(event: DragEvent, file: AppFile) {
    this.dragFacade.rowDragLeave(event, file);
  }

  onRowDragEnd(event: DragEvent) {
    this.dragFacade.rowDragEnd(event);
  }

  async onRowDrop(event: DragEvent) {
    await this.dragFacade.rowDrop(event);
  }

  onTableDragEnter(event: DragEvent) {
    this.dragFacade.tableDragEnter(event);
  }

  onTableDragOver(event: DragEvent) {
    this.dragFacade.tableDragOver(event);
  }

  async onTableDrop(event: DragEvent) {
    await this.dragFacade.rowDrop(event);
  }

  onTableDragLeave(event: DragEvent) {
    this.dragFacade.tableDragLeave(event);
  }

  // File upload controls
  stopFilesUpload(files: AppFile[]) {
    this.operationRequested.emit({ type: 'pause-upload', files });
  }

  continueFilesUpload(files: AppFile[]) {
    this.operationRequested.emit({ type: 'resume-upload', files });
  }

  async cancelFilesUpload(files: AppFile[]) {
    this.operationRequested.emit({ type: 'cancel-upload', files });
  }
}
