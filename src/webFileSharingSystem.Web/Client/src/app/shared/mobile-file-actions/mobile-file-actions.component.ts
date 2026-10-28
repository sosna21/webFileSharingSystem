import {
  Component,
  computed,
  ElementRef,
  effect,
  inject,
  input,
  signal,
  viewChild,
} from '@angular/core';
import { FileService } from '../../core/services/file.service';
import { FileUploadService } from '../../core/services/file-upload.service';
import { ModalService } from '../../core/services/modal.service';
import { SelectionService } from '../../core/services/selection.service';
import { BaseFile, FileStatus } from '../../core/models/base-file.model';
import { ShareAccessMode } from '../../core/models/share-access-mode.model';
import { generateUniqueDirName } from '../../core/utils/file-utils';
import { retainLastDefined } from '../../core/utils/signal-utils';
import { DownloadService } from '../../core/services/download.service';

@Component({
  selector: 'app-mobile-file-actions',
  imports: [],
  templateUrl: './mobile-file-actions.component.html',
  styleUrl: './mobile-file-actions.component.scss',
  host: {
    class: 'd-sm-none',
  },
})
export class MobileFileActionsComponent {
  readonly scrollContainer = input<HTMLElement | null>(null);
  readonly actionsHidden = signal(false);

  private readonly fileService = inject(FileService);
  private readonly fileUploadService = inject(FileUploadService);
  private readonly modalService = inject(ModalService);
  private readonly downloadService = inject(DownloadService);
  private readonly selectionService = inject(SelectionService<BaseFile>);
  private readonly uploadInput =
    viewChild<ElementRef<HTMLInputElement>>('uploadInput');
  private readonly parentBreadcrumb = retainLastDefined(
    this.fileService.parentBreadcrumb,
  );
  readonly selectedFiles = this.selectionService.selectedItems;

  private scrollTop = 0;
  private scrollAnchor = 0;
  private scrollDirection = 0;

  constructor() {
    effect((onCleanup) => {
      const container = this.scrollContainer();
      this.fileService.parentId();

      this.actionsHidden.set(false);

      this.scrollTop = container?.scrollTop ?? 0;
      this.scrollAnchor = this.scrollTop;
      this.scrollDirection = 0;
      container?.addEventListener('scroll', this.onScroll, {
        passive: true,
      });

      onCleanup(() => container?.removeEventListener('scroll', this.onScroll));
    });
  }

  private readonly onScroll = (event: Event) => {
    const container = event.currentTarget;
    if (!(container instanceof HTMLElement)) return;

    const nextScrollTop = container.scrollTop;
    const delta = nextScrollTop - this.scrollTop;
    this.scrollTop = nextScrollTop;

    if (nextScrollTop <= 0) {
      this.scrollAnchor = nextScrollTop;
      this.scrollDirection = 0;
      this.setVisibility(false);
      return;
    }

    const direction = Math.sign(delta);
    if (direction === 0) return;
    if (direction !== this.scrollDirection) {
      this.scrollDirection = direction;
      this.scrollAnchor = nextScrollTop;
      return;
    }

    if (
      Math.abs(nextScrollTop - this.scrollAnchor) >= 24 &&
      ((direction > 0 && !this.actionsHidden()) ||
        (direction < 0 && this.actionsHidden()))
    ) {
      this.setVisibility(direction > 0);
      this.scrollAnchor = nextScrollTop;
    }
  };

  private setVisibility(hidden: boolean) {
    this.actionsHidden.set(hidden);
  }

  readonly canCreateDirectory = computed(() => {
    const breadcrumb = this.parentBreadcrumb();
    return (
      !!breadcrumb &&
      (breadcrumb.accessMode === undefined ||
        breadcrumb.accessMode >= ShareAccessMode.ReadWrite)
    );
  });
  readonly canDownload = computed(
    () =>
      this.selectedFiles().length > 0 &&
      this.selectedFiles().some(
        (file) => file.fileStatus === FileStatus.Completed,
      ),
  );
  readonly canPaste = computed(
    () =>
      !!this.fileService.awaitingActionState() &&
      !!this.parentBreadcrumb() &&
      this.parentBreadcrumb()?.accessMode !== ShareAccessMode.ReadOnly,
  );
  readonly canUpload = computed(
    () =>
      !!this.parentBreadcrumb() &&
      this.parentBreadcrumb()?.accessMode !== ShareAccessMode.ReadOnly,
  );

  async createFolder() {
    if (!this.canCreateDirectory()) return;

    const newDirName = await this.modalService.getNewDirectoryName({
      startName: generateUniqueDirName(this.fileService.names()),
      blacklistedNames: this.fileService.names(),
    });

    if (!newDirName) return;

    this.fileService.createDirectoryWithFeedback(newDirName, (id) => {
      this.selectionService.selectedIds.set(new Set([id]));
      this.selectionService.scrollToId(id);
    });
  }

  downloadFiles() {
    const files = this.selectedFiles();
    this.downloadService.downloadFilesWithFeedback(
      files.filter((file) => file.fileStatus === FileStatus.Completed),
    );
  }

  pasteFiles() {
    if (!this.canPaste()) return;

    this.fileService.pasteFilesWithFeedback((ids) => {
      this.selectionService.selectedIds.set(ids);
      if (ids.size > 0) {
        this.selectionService.scrollToId(Array.from(ids).pop()!);
      }
    });
  }

  clearPendingAction() {
    this.fileService.clearActionContext();
  }

  openUploadPicker() {
    if (this.canUpload()) {
      this.uploadInput()?.nativeElement.click();
    }
  }

  uploadFiles(event: Event) {
    if (!(event.target instanceof HTMLInputElement)) return;

    const files = Array.from(event.target.files ?? []);
    event.target.value = '';
    if (files.length === 0 || !this.canUpload()) return;

    const filesWithPath = files.map((file) => ({ file, path: '' }));
    this.fileUploadService
      .uploadFiles([], filesWithPath, this.fileService.parentId())
      .subscribe();
  }
}
