import {
  ElementRef,
  Injectable,
  Signal,
  WritableSignal,
  computed,
  signal,
} from '@angular/core';

export interface SelectableItem {
  id: number;
}

type DragKind = null | 'standard' | 'ctrl' | 'shift';

@Injectable()
export class SelectionService<T extends SelectableItem = SelectableItem> {
  // Host supplies live files list
  private filesSig!: Signal<T[]>;
  private scrollContainerSig?: Signal<ElementRef<HTMLElement> | undefined>;

  readonly selectedIds: WritableSignal<Set<number>> = signal(new Set());
  readonly areAllChecked = computed(
    () =>
      this.filesSig?.() &&
      this.filesSig().length > 0 &&
      this.selectedIds().size === this.filesSig().length,
  );
  readonly selectedItems = computed<T[]>(() => {
    const ids = this.selectedIds();
    const list = this.filesSig ? this.filesSig() : [];
    return list.filter((f) => ids.has(f.id));
  });
  readonly dragActive = computed(() => this.dragging() !== null);

  private fileSelectionAnchorId = signal<number | null>(null);
  private dragSelectionAnchorId = signal<number | null>(null);
  private dragging = signal<DragKind>(null);
  private beforeDragIds = signal<Set<number>>(new Set());

  constructor() {
    window.addEventListener('mouseup', this.endDragSelection.bind(this));
  }

  scrollToId(id: number) {
    const files = this.filesSig ? this.filesSig() : [];
    const index = files.findIndex((f) => f.id === id);
    if (index !== -1) {
      this.fileSelectionAnchorId.set(id);
      setTimeout(() => {
        const container = this.scrollContainerSig?.()?.nativeElement;
        this.handleTableScroll(container, index);
      });
    }
  }

  init(files: Signal<T[]>) {
    this.filesSig = files;
  }

  setScrollContainer(container: Signal<ElementRef<HTMLElement> | undefined>) {
    this.scrollContainerSig = container;
  }

  onKeydown(event: KeyboardEvent) {
    const target = event.target as HTMLElement;
    if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA') return;

    if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'a') {
      event.preventDefault();
      const all = new Set(this.filesSig().map((f) => f.id));
      this.selectedIds.set(all);
    } else if (this.selectedIds().size > 0 || this.filesSig().length > 0) {
      if (event.key === 'Escape') {
        this.selectedIds.set(new Set());
      } else if (
        event.key === 'ArrowUp' ||
        event.key === 'ArrowDown' ||
        event.key === 'Home' ||
        event.key === 'End'
      ) {
        event.preventDefault();
        const files = this.filesSig();
        if (files.length === 0) return;

        const selectedIds = this.selectedIds();
        let anchorId = this.fileSelectionAnchorId();
        if (anchorId === null && selectedIds.size > 0) {
          anchorId = selectedIds.values().next().value!;
        }
        const anchorIndex = files.findIndex((f) => f.id === anchorId);
        let newIndex: number;

        if (event.key === 'Home') {
          newIndex = 0;
        } else if (event.key === 'End') {
          newIndex = files.length - 1;
        } else if (event.key === 'ArrowUp') {
          newIndex = Math.max(0, anchorIndex - 1);
        } else {
          newIndex = Math.min(files.length - 1, anchorIndex + 1);
        }

        const newAnchorId = files[newIndex].id;
        this.fileSelectionAnchorId.set(newAnchorId);

        if (event.shiftKey) {
          const startIndex = Math.min(Math.max(anchorIndex, 0), newIndex);
          const endIndex = Math.max(Math.max(anchorIndex, 0), newIndex);
          const rangeIds = files
            .filter((_, idx) => idx >= startIndex && idx <= endIndex)
            .map((f) => f.id);
          this.selectedIds.update((prev) => new Set([...prev, ...rangeIds]));
        } else {
          this.selectedIds.set(new Set([newAnchorId]));
        }

        const container = this.scrollContainerSig?.()?.nativeElement;
        this.handleTableScroll(
          container,
          newIndex,
          event.key as 'Home' | 'End' | 'ArrowUp' | 'ArrowDown',
        );
      }
    }
  }

  handleTableScroll(
    container: HTMLElement | undefined,
    index: number,
    key?: 'Home' | 'End' | 'ArrowUp' | 'ArrowDown',
  ) {
    if (!container) return;

    if (key === 'Home') {
      container.scrollTop = 0;
      return;
    }

    if (key === 'End') {
      container.scrollTop = container.scrollHeight;
      return;
    }

    const rows = Array.from(container.querySelectorAll('tr[cdk-row]'));
    if (!rows || index >= rows.length) return;

    const row = rows[index] as HTMLElement;
    const header = container.querySelector(
      'tr[cdk-header-row]',
    ) as HTMLElement | null;
    const headerHeight = header ? header.offsetHeight : 0;

    const rowTop = row.offsetTop;
    const rowBottom = rowTop + row.offsetHeight;

    const viewTop = container.scrollTop + headerHeight;
    const viewBottom = container.scrollTop + container.clientHeight;

    if (rowTop < viewTop) {
      container.scrollTop = rowTop - headerHeight;
    } else if (rowBottom > viewBottom) {
      container.scrollTop = Math.max(0, rowBottom - container.clientHeight);
    }
  }

  toggleAll(checked: boolean) {
    if (checked)
      this.selectedIds.set(new Set(this.filesSig().map((f) => f.id)));
    else this.selectedIds.set(new Set());
  }

  clear() {
    this.selectedIds.set(new Set());
  }

  selectRow(file: T, event: MouseEvent) {
    const isCtrl = event.ctrlKey || event.metaKey;
    const isShift = event.shiftKey;

    if (this.fileSelectionAnchorId() === null && this.filesSig().length > 0) {
      this.fileSelectionAnchorId.set(this.filesSig()[0].id);
    }

    const localAnchor = this.fileSelectionAnchorId();

    if (!isShift) this.fileSelectionAnchorId.set(file.id);

    if (isShift && localAnchor != null) {
      const newIndex = this.filesSig().findIndex((f) => f.id === file.id);
      const anchorIndex = this.filesSig().findIndex(
        (f) => f.id === localAnchor,
      );
      const startIndex = Math.min(newIndex, anchorIndex);
      const endIndex = Math.max(newIndex, anchorIndex);
      const rangeIds = this.filesSig()
        .filter((_, idx) => idx >= startIndex && idx <= endIndex)
        .map((f) => f.id);
      this.selectedIds.set(new Set(rangeIds));
      return;
    }

    if (isCtrl) {
      this.selectedIds.update((prev) => {
        const next = new Set(prev);
        if (next.has(file.id)) next.delete(file.id);
        else next.add(file.id);
        return next;
      });
      return;
    }

    this.selectedIds.set(new Set([file.id]));
  }

  // Drag-select support
  onRowMouseDown(row: T, event: MouseEvent) {
    if (event.button !== 0) return;
    if (this.isSelected(row.id) && !(event.ctrlKey || event.shiftKey)) return;
    this.beforeDragIds.set(new Set(this.selectedIds()));
    this.dragging.set(
      event.ctrlKey ? 'ctrl' : event.shiftKey ? 'shift' : 'standard',
    );
    this.dragSelectionAnchorId.set(row.id);
  }

  onRowMouseEnter(row: T) {
    if (!this.dragging() || !this.dragSelectionAnchorId()) return;
    this.dragSelectRows(row);
  }

  onRowMouseUp(row: T, event: MouseEvent) {
    if (!this.dragging() || !this.dragSelectionAnchorId()) return;
    if (this.dragSelectionAnchorId() === row.id) {
      this.endDragSelection();
      return;
    }
    this.dragSelectRows(row);
    this.endDragSelection();
  }

  private dragSelectRows(current: T) {
    const anchorIndex = this.filesSig().findIndex(
      (f) => f.id === this.dragSelectionAnchorId(),
    );
    const currentIndex = this.filesSig().findIndex((f) => f.id === current.id);

    if (this.dragging() === 'shift') {
      const range = new Set(
        this.filesSig()
          .filter(
            (_, i) =>
              i >= Math.min(anchorIndex, currentIndex) &&
              i <= Math.max(anchorIndex, currentIndex),
          )
          .map((f) => f.id),
      );
      this.selectedIds.update((prev) => new Set([...prev, ...range]));
    } else if (this.dragging() === 'ctrl') {
      const startSet = new Set(this.beforeDragIds());
      const idsInRange = this.filesSig()
        .filter(
          (_, i) =>
            i >= Math.min(anchorIndex, currentIndex) &&
            i <= Math.max(anchorIndex, currentIndex),
        )
        .map((f) => f.id);
      const next = new Set(startSet);
      idsInRange.forEach((id) =>
        next.has(id) ? next.delete(id) : next.add(id),
      );
      this.selectedIds.set(next);
    } else {
      const rangeIds = this.filesSig()
        .filter(
          (_, i) =>
            i >= Math.min(anchorIndex, currentIndex) &&
            i <= Math.max(anchorIndex, currentIndex),
        )
        .map((f) => f.id);
      this.selectedIds.set(new Set(rangeIds));
    }
  }

  private endDragSelection() {
    this.dragging.set(null);
    this.dragSelectionAnchorId.set(null);
    this.beforeDragIds.set(new Set());
  }

  isSelected(id: number) {
    return this.selectedIds().has(id);
  }
}
