import {
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

  readonly selectedIds: WritableSignal<Set<number>> = signal(new Set());
  readonly areAllChecked = computed(
    () =>
      this.filesSig?.() &&
      this.filesSig().length > 0 &&
      this.selectedIds().size === this.filesSig().length
  );
  readonly selectedItems = computed<T[]>(() => {
    const ids = this.selectedIds();
    const list = this.filesSig ? this.filesSig() : [];
    return list.filter((f) => ids.has(f.id));
  });

  private fileSelectionAnchorId = signal<number | null>(null);
  private dragSelectionAnchorId = signal<number | null>(null);
  private dragging = signal<DragKind>(null);
  private beforeDragIds = signal<Set<number>>(new Set());

  init(files: Signal<T[]>) {
    this.filesSig = files;
  }

  onKeydown(event: KeyboardEvent) {
    const target = event.target as HTMLElement;
    if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA') return;
    if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'a') {
      event.preventDefault();
      const all = new Set(this.filesSig().map((f) => f.id));
      this.selectedIds.set(all);
    }
  }

  toggleAll(checked: boolean) {
    if (checked)
      this.selectedIds.set(new Set(this.filesSig().map((f) => f.id)));
    else this.selectedIds.set(new Set());
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
        (f) => f.id === localAnchor
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
      event.ctrlKey ? 'ctrl' : event.shiftKey ? 'shift' : 'standard'
    );
    this.dragSelectionAnchorId.set(row.id);
  }

  onRowMouseEnter(row: T) {
    if (!this.dragging() || !this.dragSelectionAnchorId()) return;
    this.dragSelectRows(row);
  }

  onRowMouseUp(row: T) {
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
      (f) => f.id === this.dragSelectionAnchorId()
    );
    const currentIndex = this.filesSig().findIndex((f) => f.id === current.id);

    if (this.dragging() === 'shift') {
      const range = new Set(
        this.filesSig()
          .filter(
            (_, i) =>
              i >= Math.min(anchorIndex, currentIndex) &&
              i <= Math.max(anchorIndex, currentIndex)
          )
          .map((f) => f.id)
      );
      this.selectedIds.update((prev) => new Set([...prev, ...range]));
    } else if (this.dragging() === 'ctrl') {
      const startSet = new Set(this.beforeDragIds());
      const idsInRange = this.filesSig()
        .filter(
          (_, i) =>
            i >= Math.min(anchorIndex, currentIndex) &&
            i <= Math.max(anchorIndex, currentIndex)
        )
        .map((f) => f.id);
      const next = new Set(startSet);
      idsInRange.forEach((id) =>
        next.has(id) ? next.delete(id) : next.add(id)
      );
      this.selectedIds.set(next);
    } else {
      const rangeIds = this.filesSig()
        .filter(
          (_, i) =>
            i >= Math.min(anchorIndex, currentIndex) &&
            i <= Math.max(anchorIndex, currentIndex)
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
