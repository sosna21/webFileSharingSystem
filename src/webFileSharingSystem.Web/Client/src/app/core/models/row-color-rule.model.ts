export interface RowColorRule<T> {
  predicate: (row: T) => boolean;
  className: string;
}
