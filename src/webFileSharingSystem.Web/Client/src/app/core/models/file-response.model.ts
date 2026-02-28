import { AppFile } from "./app-file.model";
import { BaseFile } from "./base-file.model";

export interface FileResponse<T extends BaseFile> {
    items: T[],
    pageIndex: number,
    totalPages: number,
    totalCount: number
}