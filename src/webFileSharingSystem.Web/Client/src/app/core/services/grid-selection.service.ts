import { ElementRef, Injectable, Signal, signal } from '@angular/core';
import { SelectionService, SelectableItem } from './selection.service';

type GridNavigationKey =
  | 'ArrowUp'
  | 'ArrowDown'
  | 'ArrowLeft'
  | 'ArrowRight'
  | 'Home'
  | 'End';

interface GridItem<T extends SelectableItem> {
  id: number;
  element: HTMLElement;
  top: number;
  left: number;
  file: T;
}

@Injectable()
export class GridSelectionService<T extends SelectableItem = SelectableItem> {
  private readonly itemSelector =
    'app-user-file-grid-card, app-shared-file-grid-card';

  constructor(private readonly selection: SelectionService<T>) {}

  onKeydown(
    event: KeyboardEvent,
    filesSig: Signal<T[]>,
    scrollContainerSig: Signal<ElementRef<HTMLElement> | undefined>,
  ) {
    const eventTarget = event.target as HTMLElement;
    if (eventTarget.tagName === 'INPUT' || eventTarget.tagName === 'TEXTAREA')
      return;

    const files = filesSig();
    if (files.length === 0) return;

    if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'a') {
      event.preventDefault();
      this.selection.selectedIds.set(new Set(files.map((file) => file.id)));
      this.selection.setKeyboardNavigationState(null, files[0]?.id ?? null);
      return;
    }

    if (event.key === 'Escape') {
      event.preventDefault();
      this.selection.clear();
      return;
    }

    const navigationKey = event.key as GridNavigationKey;
    if (
      navigationKey !== 'ArrowUp' &&
      navigationKey !== 'ArrowDown' &&
      navigationKey !== 'ArrowLeft' &&
      navigationKey !== 'ArrowRight' &&
      navigationKey !== 'Home' &&
      navigationKey !== 'End'
    ) {
      return;
    }

    event.preventDefault();

    const container = scrollContainerSig()?.nativeElement;
    const items = this.getGridItems(container, files);
    if (items.length === 0) return;

    const rows = this.groupItemsIntoRows(items);
    const currentId = this.resolveCurrentId(files);
    const currentPosition = this.findPosition(rows, currentId) ?? {
      rowIndex: 0,
      columnIndex: 0,
    };

    const targetPosition = this.resolveTargetPosition(
      rows,
      currentPosition,
      navigationKey,
    );
    const selectedItem =
      rows[targetPosition.rowIndex]?.[targetPosition.columnIndex];
    if (!selectedItem) return;

    if (event.shiftKey) {
      const anchorId =
        this.selection.getKeyboardAnchorId() ??
        this.resolveAnchorId(files, currentId);
      const anchorIndex = files.findIndex((file) => file.id === anchorId);
      const targetIndex = files.findIndex(
        (file) => file.id === selectedItem.id,
      );

      if (anchorIndex === -1 || targetIndex === -1) return;

      const startIndex = Math.min(anchorIndex, targetIndex);
      const endIndex = Math.max(anchorIndex, targetIndex);
      const rangeIds = files
        .slice(startIndex, endIndex + 1)
        .map((file) => file.id);
      this.selection.selectedIds.set(new Set(rangeIds));
      this.selection.setKeyboardNavigationState(anchorId, selectedItem.id);
    } else {
      this.selection.selectedIds.set(new Set([selectedItem.id]));
      this.selection.setKeyboardNavigationState(
        selectedItem.id,
        selectedItem.id,
      );
    }

    this.selection.scrollToId(selectedItem.id);
  }

  private resolveCurrentId(files: T[]) {
    return (
      this.selection.getKeyboardFocusId() ??
      this.selection.selectedItems()[0]?.id ??
      files[0]?.id ??
      null
    );
  }

  private resolveAnchorId(files: T[], currentId: number | null) {
    if (currentId !== null) return currentId;
    return files[0]?.id ?? null;
  }

  private getGridItems(container: HTMLElement | undefined, files: T[]) {
    if (!container) return [] as GridItem<T>[];

    const elements = Array.from(
      container.querySelectorAll(this.itemSelector),
    ) as HTMLElement[];

    return elements
      .map((element, index) => {
        const file = files[index];
        if (!file) return null;

        const rect = element.getBoundingClientRect();
        return {
          id: file.id,
          element,
          top: rect.top,
          left: rect.left,
          file,
        };
      })
      .filter((item): item is GridItem<T> => item !== null);
  }

  private groupItemsIntoRows(items: Array<GridItem<T>>) {
    const sortedItems = [...items].sort(
      (left, right) => left.top - right.top || left.left - right.left,
    );

    const rows: Array<Array<GridItem<T>>> = [];
    for (const item of sortedItems) {
      const row = rows.find(
        (candidate) => Math.abs(candidate[0].top - item.top) <= 2,
      );

      if (row) {
        row.push(item);
      } else {
        rows.push([item]);
      }
    }

    return rows.map((row) => row.sort((left, right) => left.left - right.left));
  }

  private findPosition(
    rows: Array<Array<GridItem<T>>>,
    id: number | null,
  ): { rowIndex: number; columnIndex: number } | null {
    if (id === null) return null;

    for (let rowIndex = 0; rowIndex < rows.length; rowIndex += 1) {
      const columnIndex = rows[rowIndex].findIndex((item) => item.id === id);
      if (columnIndex !== -1) {
        return { rowIndex, columnIndex };
      }
    }

    return null;
  }

  private resolveTargetPosition(
    rows: Array<Array<GridItem<T>>>,
    currentPosition: { rowIndex: number; columnIndex: number },
    key: GridNavigationKey,
  ) {
    const currentRow = rows[currentPosition.rowIndex];

    if (key === 'Home') {
      return { rowIndex: 0, columnIndex: 0 };
    }

    if (key === 'End') {
      const lastRowIndex = rows.length - 1;
      return {
        rowIndex: lastRowIndex,
        columnIndex: rows[lastRowIndex].length - 1,
      };
    }

    if (key === 'ArrowUp' || key === 'ArrowDown') {
      const nextRowIndex =
        currentPosition.rowIndex + (key === 'ArrowDown' ? 1 : -1);
      if (nextRowIndex < 0 || nextRowIndex >= rows.length) {
        return currentPosition;
      }

      const nextRow = rows[nextRowIndex];
      return {
        rowIndex: nextRowIndex,
        columnIndex: Math.min(currentPosition.columnIndex, nextRow.length - 1),
      };
    }

    if (key === 'ArrowRight') {
      if (currentPosition.columnIndex + 1 < currentRow.length) {
        return {
          rowIndex: currentPosition.rowIndex,
          columnIndex: currentPosition.columnIndex + 1,
        };
      }

      const nextRowIndex = currentPosition.rowIndex + 1;
      if (nextRowIndex < rows.length) {
        return { rowIndex: nextRowIndex, columnIndex: 0 };
      }

      return currentPosition;
    }

    if (key === 'ArrowLeft') {
      if (currentPosition.columnIndex > 0) {
        return {
          rowIndex: currentPosition.rowIndex,
          columnIndex: currentPosition.columnIndex - 1,
        };
      }

      const previousRowIndex = currentPosition.rowIndex - 1;
      if (previousRowIndex >= 0) {
        return {
          rowIndex: previousRowIndex,
          columnIndex: rows[previousRowIndex].length - 1,
        };
      }

      return currentPosition;
    }

    return currentPosition;
  }
}
