import { AppFile } from "./app-file.model";

export interface FileResponse {
    items: AppFile[],
    pageIndex: number,
    totalPages: number,
    totalCount: number
}