export { extractBlocks, blocksToText, type TextBlock } from "./extractor";
export { chunkBlocks, type Chunk, type ChunkOptions } from "./chunker";
export {
  embedText,
  embedTexts,
  serializeEmbedding,
  deserializeEmbedding,
  preloadModel,
} from "./embedder";
export {
  indexNoteEmbeddings,
  deleteNoteChunks,
  getNoteChunkCount,
} from "./indexer";
export {
  semanticSearch,
  getIndexedNoteCount,
  getTotalChunkCount,
  type SemanticSearchResult,
} from "./search";
export {
  backfillAllNotes,
  backfillNote,
  type BackfillProgress,
  type BackfillProgressCallback,
} from "./backfill";
