import { TemplateRef } from "@angular/core";

export interface TableColumn<T> {
  key: keyof T | (string & {});                // Data key
  header: string;                        // Column header
  customTemplate?: TemplateRef<{ $implicit: T[keyof T]; row: T; }>; // Template ref name for custom cell
  disableFilters?: boolean;
  customFilter?: (val: unknown) => string;
}

export interface FilterOption {
  value: unknown;
  selected: boolean;
}

export interface SortState {
  key: string;
  direction: 'asc' | 'desc';
  order: number
}