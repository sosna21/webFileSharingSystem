import { ShareAccessMode } from "./share-access-mode.model";

export interface Breadcrumb {
  id: number | null;
  fileName: string;
  level: number;
  accessMode?: ShareAccessMode;
  validUntil?: string | null;
}
