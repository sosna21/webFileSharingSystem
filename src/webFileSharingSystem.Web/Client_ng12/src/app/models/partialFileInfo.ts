export interface PartialFileInfo {
  fileId: number,
  fileSize: number,
  chunkSize: number,
  persistenceMap: Uint8Array,
  numberOfChunks: number,
  lastChunkSize: number
}
