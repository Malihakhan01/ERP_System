// types/table.ts
// Generic DataTable types

export interface ColumnDef<T> {
  /** Unique key — maps to a field on T, or a custom key */
  key: string;
  /** Column header label */
  header: string;
  /** Optional render function — if omitted, renders (row as any)[key] as string */
  render?: (row: T, index: number) => React.ReactNode;
  /** Column alignment */
  align?: "left" | "center" | "right";
  /** Whether this column is sortable */
  sortable?: boolean;
  /** Optional width class (e.g. "w-32") */
  width?: string;
  /** Hide on mobile */
  hideMobile?: boolean;
}

export interface PaginationState {
  page: number;
  pageSize: number;
  total: number;
}

export interface SortState {
  key: string;
  direction: "asc" | "desc";
}

export type TableStatus = "idle" | "loading" | "empty" | "error";
