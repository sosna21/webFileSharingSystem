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
type RubberBandMode = 'replace' | 'add' | 'toggle';
type RubberBandState = 'idle' | 'armed' | 'dragging';

interface RubberBandPoint {
  x: number;
  y: number;
}

interface RubberBandBounds {
  left: number;
  top: number;
  width: number;
  height: number;
}

@Injectable()
export class SelectionService<T extends SelectableItem = SelectableItem> {
  // Host supplies live files list\
  private static readonly DRAG_THRESHOLD = 5;
  private static readonly AUTO_SCROLL_MIN_SPEED = 120;
  private static readonly AUTO_SCROLL_MAX_SPEED = 900;
  private static readonly AUTO_SCROLL_SPEED_PER_PX = 45;

  protected filesSig!: Signal<T[]>;
  protected scrollContainerSig?: Signal<ElementRef<HTMLElement> | undefined>;

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
  private keyboardFocusId = signal<number | null>(null);
  private rubberBandStartPoint = signal<RubberBandPoint | null>(null);
  private rubberBandCurrentPoint = signal<RubberBandPoint | null>(null);
  private rubberBandPointerPoint = signal<RubberBandPoint | null>(null);
  private rubberBandContainer = signal<HTMLElement | null>(null);
  private rubberBandItemSelector = signal<string>('');
  private rubberBandBaseSelection = signal<Set<number>>(new Set());
  private rubberBandMode = signal<RubberBandMode>('replace');
  private rubberBandState = signal<RubberBandState>('idle');
  private dragging = signal<DragKind>(null);
  private autoScrollFrameId: number | null = null;
  private autoScrollLastTimestamp: number | null = null;
  private autoScrollRemainder = 0;

  private readonly rubberBandStarted = computed(
    () => this.rubberBandState() !== 'idle',
  );

  readonly rubberBandActive = computed(
    () => this.rubberBandState() === 'dragging',
  );

  readonly rubberBandBounds = computed<RubberBandBounds | null>(() => {
    const start = this.rubberBandStartPoint();
    const current = this.rubberBandCurrentPoint();

    if (!start || !current) return null;

    return {
      left: Math.min(start.x, current.x),
      top: Math.min(start.y, current.y),
      width: Math.abs(current.x - start.x),
      height: Math.abs(current.y - start.y),
    };
  });

  scrollToId(id: number) {
    const files = this.filesSig ? this.filesSig() : [];
    const index = files.findIndex((f) => f.id === id);
    if (index !== -1) {
      this.keyboardFocusId.set(id);
      setTimeout(() => {
        const container = this.scrollContainerSig?.()?.nativeElement;
        this.handleScrollToIndex(container, index);
      });
    }
  }

  init(files: Signal<T[]>) {
    this.filesSig = files;
  }

  setScrollContainer(container: Signal<ElementRef<HTMLElement> | undefined>) {
    this.scrollContainerSig = container;
  }

  getScrollContainerElement() {
    return this.scrollContainerSig?.()?.nativeElement ?? null;
  }

  getKeyboardFocusId() {
    return this.keyboardFocusId();
  }

  getKeyboardAnchorId() {
    return this.fileSelectionAnchorId();
  }

  setKeyboardNavigationState(anchorId: number | null, focusId: number | null) {
    this.fileSelectionAnchorId.set(anchorId);
    this.keyboardFocusId.set(focusId);
  }

  clearKeyboardNavigationState() {
    this.fileSelectionAnchorId.set(null);
    this.keyboardFocusId.set(null);
  }

  beginRubberBandSelection(
    event: PointerEvent,
    container: HTMLElement,
    itemSelector: string,
  ) {
    if (event.button !== 0) return false;

    const target = event.target as HTMLElement;
    if (!this.canStartRubberBandOnTarget(target)) return false;

    const point = this.clientPointToContainerPoint(
      event.clientX,
      event.clientY,
      container,
    );

    this.rubberBandPointerPoint.set({ x: event.clientX, y: event.clientY });
    this.rubberBandStartPoint.set(point);
    this.rubberBandCurrentPoint.set(point);
    this.rubberBandContainer.set(container);
    this.rubberBandItemSelector.set(itemSelector);
    this.rubberBandState.set('armed');
    return true;
  }

  updateRubberBandSelection(event?: PointerEvent) {
    if (this.rubberBandState() === 'idle') return;

    if (event) {
      // update pointer
      if (this.rubberBandState() === 'armed') {
        const dx = event.clientX - this.rubberBandPointerPoint()!.x;
        const dy = event.clientY - this.rubberBandPointerPoint()!.y;

        const threshold = SelectionService.DRAG_THRESHOLD;
        if (dx * dx + dy * dy < threshold * threshold) {
          return;
        }
        this.rubberBandMode.set(
          event.ctrlKey ? 'toggle' : event.shiftKey ? 'add' : 'replace',
        );
        this.rubberBandBaseSelection.set(new Set(this.selectedIds()));

        this.rubberBandState.set('dragging');
      }

      this.rubberBandPointerPoint.set({ x: event.clientX, y: event.clientY });
    }

    // perform selection
    const container = this.rubberBandContainer();
    const selector = this.rubberBandItemSelector();
    const pointer = this.rubberBandPointerPoint();
    const files = this.filesSig ? this.filesSig() : [];

    if (!container || !selector || !pointer) return;

    this.rubberBandCurrentPoint.set(
      this.clientPointToContainerPoint(pointer.x, pointer.y, container),
    );
    const bounds = this.rubberBandBounds()!;

    const touchedIds = this.getRubberBandTouchedIds(
      container,
      selector,
      files,
      bounds,
    );

    if (this.rubberBandMode() === 'add') {
      const next = new Set(this.rubberBandBaseSelection());
      touchedIds.forEach((id) => next.add(id));
      this.selectedIds.set(next);
    } else if (this.rubberBandMode() === 'toggle') {
      const next = new Set(this.rubberBandBaseSelection());
      touchedIds.forEach((id) => {
        if (next.has(id)) next.delete(id);
        else next.add(id);
      });
      this.selectedIds.set(next);
    } else {
      this.selectedIds.set(touchedIds);
    }

    this.syncRubberBandAutoScroll();
  }

  endRubberBandSelection() {
    if (!this.rubberBandStarted()) return;

    this.stopRubberBandAutoScroll();

    this.rubberBandStartPoint.set(null);
    this.rubberBandCurrentPoint.set(null);
    this.rubberBandPointerPoint.set(null);
    this.rubberBandContainer.set(null);
    this.rubberBandItemSelector.set('');
    this.rubberBandBaseSelection.set(new Set());
    this.rubberBandMode.set('replace');
    this.rubberBandState.set('idle');
  }

  private syncRubberBandAutoScroll() {
    if (!this.shouldRubberBandAutoScroll()) {
      this.stopRubberBandAutoScroll();
      return;
    }

    if (this.autoScrollFrameId !== null) return;

    this.autoScrollFrameId = window.requestAnimationFrame(
      this.stepRubberBandAutoScroll,
    );
  }

  private stopRubberBandAutoScroll() {
    if (this.autoScrollFrameId !== null) {
      window.cancelAnimationFrame(this.autoScrollFrameId);
      this.autoScrollFrameId = null;
    }

    this.autoScrollLastTimestamp = null;
    this.autoScrollRemainder = 0;
  }

  private readonly stepRubberBandAutoScroll = (timestamp: number) => {
    this.autoScrollFrameId = null;

    if (!this.shouldRubberBandAutoScroll()) {
      return;
    }

    const container = this.rubberBandContainer();
    const pointer = this.rubberBandPointerPoint();

    if (!container || !pointer) return;

    const deltaDirection = this.getRubberBandAutoScrollDirection(
      container,
      pointer,
    );
    if (deltaDirection.sign === 0) return;

    const dt =
      this.autoScrollLastTimestamp === null
        ? 16
        : Math.max(1, timestamp - this.autoScrollLastTimestamp);
    this.autoScrollLastTimestamp = timestamp;

    const maxScrollTop = Math.max(
      0,
      container.scrollHeight - container.clientHeight,
    );

    const speed = this.getRubberBandAutoScrollSpeed(
      Math.abs(deltaDirection.distanceOutside),
    );
    const deltaPx = (speed * dt) / 1000;
    this.autoScrollRemainder += deltaPx;

    const scrollDelta =
      Math.trunc(this.autoScrollRemainder) * deltaDirection.sign;
    if (scrollDelta === 0) {
      this.scheduleRubberBandAutoScroll();
      return;
    }

    this.autoScrollRemainder -= Math.trunc(this.autoScrollRemainder);

    const nextScrollTop = this.clamp(
      container.scrollTop + scrollDelta,
      0,
      maxScrollTop,
    );

    if (nextScrollTop === container.scrollTop) {
      return;
    }

    container.scrollTop = nextScrollTop;
    this.updateRubberBandSelection();

    this.scheduleRubberBandAutoScroll();
  };

  private scheduleRubberBandAutoScroll() {
    if (!this.shouldRubberBandAutoScroll()) {
      this.stopRubberBandAutoScroll();
      return;
    }

    if (this.autoScrollFrameId !== null) return;

    this.autoScrollFrameId = window.requestAnimationFrame(
      this.stepRubberBandAutoScroll,
    );
  }

  private shouldRubberBandAutoScroll() {
    if (this.rubberBandState() !== 'dragging') return false;
    const container = this.rubberBandContainer();
    const pointer = this.rubberBandPointerPoint();
    if (!container || !pointer) return false;
    return this.getRubberBandAutoScrollDirection(container, pointer).sign !== 0;
  }

  private getRubberBandAutoScrollDirection(
    container: HTMLElement,
    pointer: RubberBandPoint,
  ) {
    const rect = container.getBoundingClientRect();
    const topDistance = rect.top - pointer.y;
    if (topDistance > 0) {
      if (container.scrollTop <= 0) {
        return { sign: 0, distanceOutside: topDistance };
      }
      return { sign: -1, distanceOutside: topDistance };
    }

    const bottomDistance = pointer.y - rect.bottom;
    if (bottomDistance > 0) {
      const maxScrollTop = Math.max(
        0,
        container.scrollHeight - container.clientHeight,
      );
      if (container.scrollTop >= maxScrollTop) {
        return { sign: 0, distanceOutside: bottomDistance };
      }
      return { sign: 1, distanceOutside: bottomDistance };
    }

    return { sign: 0, distanceOutside: 0 };
  }

  private getRubberBandAutoScrollSpeed(distanceOutside: number) {
    return this.clamp(
      SelectionService.AUTO_SCROLL_MIN_SPEED +
        distanceOutside * SelectionService.AUTO_SCROLL_SPEED_PER_PX,
      SelectionService.AUTO_SCROLL_MIN_SPEED,
      SelectionService.AUTO_SCROLL_MAX_SPEED,
    );
  }

  private clamp(value: number, min: number, max: number) {
    return Math.min(max, Math.max(min, value));
  }

  private clientPointToContainerPoint(
    clientX: number,
    clientY: number,
    container: HTMLElement,
  ): RubberBandPoint {
    const rect = container.getBoundingClientRect();
    return {
      x: clientX - rect.left + container.scrollLeft,
      y: clientY - rect.top + container.scrollTop,
    };
  }

  private canStartRubberBandOnTarget(target: HTMLElement) {
    if (target.closest('[data-content]')) return false;
    if (target.closest('.selected')) return false;
    if (target.closest('tr[cdk-header-row]')) return false;

    return true;
  }

  private getRubberBandTouchedIds(
    container: HTMLElement,
    itemSelector: string,
    files: T[],
    bounds: RubberBandBounds,
  ) {
    const elements = Array.from(
      container.querySelectorAll(itemSelector),
    ) as HTMLElement[];
    const ids = new Set<number>();
    const containerRect = container.getBoundingClientRect();

    elements.forEach((element, index) => {
      const file = files[index];
      if (!file) return;

      const rect = element.getBoundingClientRect();
      const elementBounds = {
        left: rect.left - containerRect.left + container.scrollLeft,
        top: rect.top - containerRect.top + container.scrollTop,
        width: rect.width,
        height: rect.height,
      };
      if (this.rectsIntersect(elementBounds, bounds)) {
        ids.add(file.id);
      }
    });

    return ids;
  }

  private rectsIntersect(a: RubberBandBounds, b: RubberBandBounds) {
    return !(
      a.left + a.width < b.left ||
      a.left > b.left + b.width ||
      a.top + a.height < b.top ||
      a.top > b.top + b.height
    );
  }

  onKeydown(event: KeyboardEvent) {
    const target = event.target as HTMLElement;
    if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA') return;

    if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'a') {
      event.preventDefault();
      const all = new Set(this.filesSig().map((f) => f.id));
      this.selectedIds.set(all);
      this.keyboardFocusId.set(this.filesSig()[0]?.id ?? null);
      this.fileSelectionAnchorId.set(null);
    } else if (this.selectedIds().size > 0 || this.filesSig().length > 0) {
      if (event.key === 'Escape') {
        this.selectedIds.set(new Set());
        this.clearKeyboardNavigationState();
      } else if (
        event.key === 'ArrowUp' ||
        event.key === 'ArrowDown' ||
        event.key === 'Home' ||
        event.key === 'End'
      ) {
        event.preventDefault();
        const files = this.filesSig();
        if (files.length === 0) return;

        const currentFocusId =
          this.keyboardFocusId() ?? this.selectedItems()[0]?.id ?? files[0].id;
        const currentIndex = files.findIndex((f) => f.id === currentFocusId);
        let newIndex: number;

        if (event.key === 'Home') {
          newIndex = 0;
        } else if (event.key === 'End') {
          newIndex = files.length - 1;
        } else if (event.key === 'ArrowUp') {
          newIndex = Math.max(0, currentIndex - 1);
        } else {
          newIndex = Math.min(files.length - 1, currentIndex + 1);
        }

        const nextFocusedId = files[newIndex].id;
        const anchorId =
          this.fileSelectionAnchorId() ?? currentFocusId ?? nextFocusedId;

        if (event.shiftKey) {
          const anchorIndex = files.findIndex((f) => f.id === anchorId);
          const startIndex = Math.min(Math.max(anchorIndex, 0), newIndex);
          const endIndex = Math.max(Math.max(anchorIndex, 0), newIndex);
          const rangeIds = files
            .filter((_, idx) => idx >= startIndex && idx <= endIndex)
            .map((f) => f.id);
          this.selectedIds.set(new Set(rangeIds));
          if (this.fileSelectionAnchorId() === null) {
            this.fileSelectionAnchorId.set(anchorId);
          }
        } else {
          this.selectedIds.set(new Set([nextFocusedId]));
          this.fileSelectionAnchorId.set(nextFocusedId);
        }

        this.keyboardFocusId.set(nextFocusedId);

        const container = this.scrollContainerSig?.()?.nativeElement;
        this.handleScrollToIndex(
          container,
          newIndex,
          event.key as 'Home' | 'End' | 'ArrowUp' | 'ArrowDown',
        );
      }
    }
  }

  handleScrollToIndex(
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

    const tableRows = Array.from(
      container.querySelectorAll('tr[cdk-row]'),
    ) as HTMLElement[];
    if (tableRows.length > 0) {
      if (index >= tableRows.length) return;

      const row = tableRows[index];
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
      return;
    }

    const gridItems = Array.from(
      container.querySelectorAll(
        'app-user-file-grid-card, app-shared-file-grid-card',
      ),
    ) as HTMLElement[];

    if (index >= gridItems.length) return;

    gridItems[index]?.scrollIntoView({
      block: 'nearest',
      inline: 'nearest',
    });
  }

  toggleAll(checked: boolean) {
    if (checked)
      this.selectedIds.set(new Set(this.filesSig().map((f) => f.id)));
    else this.selectedIds.set(new Set());
  }

  clear() {
    this.selectedIds.set(new Set());
    this.clearKeyboardNavigationState();
    this.endRubberBandSelection();
  }

  selectFile(file: T, event: MouseEvent) {
    const isCtrl = event.ctrlKey || event.metaKey;
    const isShift = event.shiftKey;

    const localAnchor = this.fileSelectionAnchorId() ?? file.id;

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
      this.setKeyboardNavigationState(localAnchor, file.id);
      return;
    }

    if (isCtrl) {
      this.selectedIds.update((prev) => {
        const next = new Set(prev);
        if (next.has(file.id)) next.delete(file.id);
        else next.add(file.id);
        return next;
      });
      this.setKeyboardNavigationState(file.id, file.id);
      return;
    }

    this.selectedIds.set(new Set([file.id]));
    this.setKeyboardNavigationState(file.id, file.id);
  }

  isSelected(id: number) {
    return this.selectedIds().has(id);
  }
}
