import { CommonModule, NgTemplateOutlet, DatePipe } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  computed,
  input,
  linkedSignal,
  model,
  signal,
} from '@angular/core';
import { NgbDropdownModule } from '@ng-bootstrap/ng-bootstrap';
import { RowColorRule } from '../../../core/models/row-color-rule.model';
import { TableColumn, SortState, FilterOption } from '../../../core/models/table-column.model';

@Component({
  selector: 'app-base-table',
  imports: [CommonModule, NgbDropdownModule, NgTemplateOutlet, DatePipe],
  templateUrl: './base-table.component.html',
  styleUrl: './base-table.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class BaseTableComponent<T extends object> {
  // Inputs
  readonly data = input.required<T[]>();
  readonly addId = input(false);
  readonly columns = input<TableColumn<T>[]>([]);
  readonly rowColorRules = input<RowColorRule<T>[]>([]);
  readonly singleSelect = input<boolean>(false);
  readonly rowSize = input<'lg' | 'md' | 'sm'>('lg');
  readonly rowSizeClass = computed(() => ({
    'table-sm': this.rowSize() === 'md',
    'ultra-small': this.rowSize() === 'sm',
  }));

  // Two way bindings
  readonly selectedRows = model<T[]>([]);

  // Signals
  private readonly lastSelectedRow = signal<T | null>(null);
  readonly sortState = signal<SortState[]>([]);
  private _sortOrderCounter = 0;

  readonly dragging = signal<null | 'standard' | 'ctrl' | 'shift'>(null);
  readonly dragSelectionAnchor = signal<T | null>(null);
  readonly filesSelectedBeforeDrag = signal<T[]>([]);

  get sortOrderCounter() {
    return this._sortOrderCounter++;
  }

  filters = linkedSignal<{ data: T[]; columns: TableColumn<T>[] }, Record<string, FilterOption[]>>({
    source: () => ({ data: this.data(), columns: this.columns() }),
    computation: (newSource, prevData) => {
      const newFilters: Record<string, FilterOption[]> = {};
      const prevFilters = prevData?.value ?? {};

      for (const col of newSource.columns) {
        const distinctMap = new Map<string, unknown>();
        if (col.disableFilters) continue;

        for (const row of newSource.data) {
          let val = (row as any)[col.key];
          let key: string;

          if (col.customFilter) {
            const result = col.customFilter(val);
            key = result;
            val = result;
          } else {
            if (val instanceof Date) {
              key = val.toISOString().split('T')[0];
            } else {
              key = String(val);
            }
          }

          if (!distinctMap.has(key)) {
            distinctMap.set(key, val);
          }
        }

        const prevColumnFilters = prevFilters[col.key as string] ?? [];

        newFilters[col.key as string] = Array.from(distinctMap.values())
          .sort((a, b) => {
            if (a == null && b == null) return 0;
            if (a == null) return -1;
            if (b == null) return 1;
            // Dates
            if (a instanceof Date && b instanceof Date) {
              return a.getTime() - b.getTime();
            }
            // Numbers
            if (typeof a === 'number' && typeof b === 'number') {
              return a - b;
            }
            // Fallback to string
            return String(a).localeCompare(String(b), undefined, { numeric: true });
          })
          .map((v) => ({
            value: v,
            selected: this.getPrevOrDefault(prevColumnFilters, v),
          }));
      }
      return newFilters;
    },
  });

  private getPrevOrDefault(prevFilterOptions: FilterOption[], value: unknown): boolean {
    const prevFilter = prevFilterOptions.find((fo) => this.valuesEqual(fo.value, value));
    return prevFilter ? prevFilter.selected : true;
  }

  private valuesEqual(a: unknown, b: unknown): boolean {
    if (a instanceof Date && b instanceof Date) {
      return a.getTime() === b.getTime();
    }

    return a === b;
  }

  // Derived
  filteredData = computed(() => {
    let result = this.data();
    // Apply filters
    for (const [key, options] of Object.entries(this.filters())) {
      const allowedValues = options.filter((o) => o.selected).map((o) => o.value);

      result = result.filter((row) => {
        let rowVal = (row as any)[key];
        const column = this.columns().find((col) => col.key === key);
        if (column && column.customFilter) {
          rowVal = column.customFilter(rowVal);
        }

        return allowedValues.some((v) => this.valuesEqual(v, rowVal));
      });
    }

    // Apply sorting
    const sortedSortState = this.sortState().sort((a, b) => (a.order > b.order ? -1 : 1));
    for (const sort of sortedSortState) {
      result.sort((a, b) => {
        const av = (a as any)[sort.key];
        const bv = (b as any)[sort.key];
        if (av == null && bv == null) return 0;
        if (av == null) return sort.direction === 'asc' ? -1 : 1;
        if (bv == null) return sort.direction === 'asc' ? 1 : -1;
        return sort.direction === 'asc'
          ? av > bv
            ? 1
            : av < bv
              ? -1
              : 0
          : av < bv
            ? 1
            : av > bv
              ? -1
              : 0;
      });
    }

    return result;
  });

  toggleSort(key: string) {
    const current = [...this.sortState()];
    const existing = current.find((s) => s.key === key);
    if (!existing) {
      current.push({ key, direction: 'asc', order: this.sortOrderCounter });
    } else if (existing.direction === 'asc') {
      existing.direction = 'desc';
    } else {
      const idx = current.indexOf(existing);
      current.splice(idx, 1);
    }
    this.sortState.set(current);
  }

  toggleFilterValue(colKey: string, value: unknown) {
    this.clearRowSelection();
    this.filters.update((f) => {
      const options = f[colKey];
      const opt = options.find((o) => o.value === value);
      if (opt) opt.selected = !opt.selected;
      return { ...f };
    });
  }

  singleSelectFilterValue(colKey: string, value: unknown) {
    this.clearRowSelection();
    this.filters.update((f) => {
      const options = f[colKey];
      options.forEach((opt) =>
        opt.value === value ? (opt.selected = true) : (opt.selected = false),
      );
      return { ...f };
    });
  }

  clearRowSelection() {
    if (this.selectedRows().length === 0) return;
    this.selectedRows.set([]);
  }

  filterByValue(colKey: string, event: Event) {
    this.clearRowSelection();
    const input = event.target as HTMLInputElement;
    const filterValue = input.value.trim().toLowerCase();

    this.filters.update((f) => {
      const options = f[colKey];

      options.forEach((opt) =>
        String(opt.value).trim().toLowerCase().includes(filterValue)
          ? (opt.selected = true)
          : (opt.selected = false),
      );
      return { ...f };
    });
  }

  getAppliedFiltersNb(colKey: string) {
    const colFilters = this.filters()[colKey];
    const filtered = colFilters.filter((filter) => !filter.selected);
    return filtered.length;
  }

  restetFilters(colKey: string) {
    this.filters.update((f) => {
      const options = f[colKey];
      options.forEach((opt) => (opt.selected = true));
      return { ...f };
    });
  }

  handleRowClick(event: MouseEvent, idx: number) {
    const row = this.filteredData()[idx];

    if (!this.singleSelect()) {
      const isCtrl = event.ctrlKey || event.metaKey;
      const isShift = event.shiftKey;

      if (this.lastSelectedRow() === null) this.lastSelectedRow.set(this.filteredData()[0]);

      const localLastSelectedRow = this.lastSelectedRow();

      //if the shift key is pressed, we need to keep the last selected file id,
      // as it will be used as an anchor for the selection

      if (!isShift) {
        this.lastSelectedRow.set(row);
      }

      if (isShift) {
        const newFileIndex = idx;
        const anchorIndex = this.filteredData().findIndex((f) => f === localLastSelectedRow);
        this.selectRowsBetween(newFileIndex, anchorIndex);
        return;
      }

      if (isCtrl) {
        if (this.isRowSelected(row))
          this.selectedRows.update((rows) => [...rows.filter((r) => !this.compareRows(row, r))]);
        else this.selectedRows.set([...this.selectedRows(), row]);
        return;
      }
    }

    this.selectedRows.set([row]);
  }

  private selectRowsBetween(firstIndex: number, secondIndex: number) {
    const startIndex = Math.min(firstIndex, secondIndex);
    const endIndex = Math.max(firstIndex, secondIndex);

    const rows = this.filteredData().filter((_, index) => index >= startIndex && index <= endIndex);
    this.selectedRows.set(rows);
  }

  isRowSelected(row: T) {
    // Try ID-based matching if 'id' exists in the row
    if ('id' in (row as object)) {
      const idKey = 'id' as keyof T;
      return this.selectedRows().some((r) => r[idKey] === row[idKey]);
    }
    // Fallback to reference equality
    return this.selectedRows().includes(row);
  }

  private compareRows(row1: T, row2: T) {
    // Try ID-based matching if 'id' exists in the row
    if ('id' in (row1 as object) && 'id' in (row2 as object)) {
      const idKey = 'id' as keyof T;
      return row1[idKey] === row2[idKey];
    }
    return row1 === row2;
  }

  private getRowIndex(row: T) {
    return this.filteredData().findIndex((r) => this.compareRows(r, row));
  }

  rowClasses(row: T): string {
    for (const rule of this.rowColorRules()) {
      if (rule.predicate(row)) return rule.className;
    }
    return '';
  }

  getColKeyAsString(col: TableColumn<T>): string {
    return col.key as string;
  }

  getColKeyAsKeyOfT(col: TableColumn<T>) {
    return col.key as keyof T;
  }

  getSortStateByKey(key: string) {
    return this.sortState().find((s) => s.key === key);
  }

  isValDateType(arg: T[keyof T]) {
    return arg instanceof Date;
  }

  isLastFilterOptLeft(colKey: string) {
    return this.filters()[colKey].filter((filter) => filter.selected).length <= 1;
  }

  isColDateType(colKey: string) {
    const sample = this.data()[0];
    if (!sample || !(colKey in sample)) {
      return false;
    }
    return this.data().some((row) => row[colKey as keyof T] instanceof Date);
  }

  tryGetRowId<T>(row: T) {
    if ('id' in (row as object)) {
      const idKey = 'id' as keyof T;
      return row[idKey];
    }
    return null;
  }

  onRowMouseDown(row: T, event: MouseEvent) {
    if (event.button !== 0) return; // left button only
    event.preventDefault();
    this.filesSelectedBeforeDrag.set(this.selectedRows());

    if (event.ctrlKey) {
      this.dragging.set('ctrl');
    } else if (event.shiftKey) {
      this.dragging.set('shift');
    } else {
      this.dragging.set('standard');
    }
    this.dragSelectionAnchor.set(row);
  }

  onRowMouseEnter(row: T) {
    if (!this.dragging || !this.dragSelectionAnchor()) return;

    const firstIndex = this.getRowIndex(this.dragSelectionAnchor()!);
    const secondIndex = this.getRowIndex(row);
    this.dragSelectRows(firstIndex, secondIndex);
  }

  onRowMouseUp(row: T) {
    if (!this.dragging() || !this.dragSelectionAnchor()) return;
    if (this.dragging() && this.compareRows(row, this.dragSelectionAnchor()!)) {
      this.endDragSelection();
      return;
    }

    const firstIndex = this.getRowIndex(this.dragSelectionAnchor()!);
    const secondIndex = this.getRowIndex(row);
    this.dragSelectRows(firstIndex, secondIndex);

    this.endDragSelection();
  }

  onMouseUpWindow(event: MouseEvent) {
    this.endDragSelection();
  }

  private dragSelectRows(firstIndex: number, secondIndex: number) {
    this.selectRowsBetween(firstIndex, secondIndex);

    if (this.dragging() === 'shift') {
      //add to selection rows from selectedBeforeDrag
      const rowsToAdd = this.filesSelectedBeforeDrag().filter((row) => !this.isRowSelected(row));
      this.selectedRows.update((rows) => [...rows, ...rowsToAdd]);
    } else if (this.dragging() == 'ctrl') {
      const rowsToAdd = this.filesSelectedBeforeDrag().filter((row) => !this.isRowSelected(row));
      const rowsToRemove = this.filesSelectedBeforeDrag().filter((row) => !rowsToAdd.includes(row));
      this.selectedRows.update((rows) => [
        ...rows.filter((row) => !rowsToRemove.includes(row)),
        ...rowsToAdd,
      ]);
    }
  }

  private endDragSelection() {
    this.dragging.set(null);
    this.dragSelectionAnchor.set(null);
  }
}