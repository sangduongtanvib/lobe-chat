import { FilesConfig, FilesConfigItem } from '@/types/user/settings/filesConfig';

import {
  DEFAULT_EMBEDDING_MODEL,
  DEFAULT_EMBEDDING_PROVIDER,
  DEFAULT_RERANK_MODEL,
  DEFAULT_RERANK_PROVIDER,
  DEFAULT_RERANK_QUERY_MODE,
} from './llm';

export const DEFAULT_FILE_EMBEDDING_MODEL_ITEM: FilesConfigItem = {
  model: DEFAULT_EMBEDDING_MODEL,
  provider: DEFAULT_EMBEDDING_PROVIDER,
  // dimensions will be set from env config or model defaults
};

export const DEFAULT_FILE_RERANK_MODEL_ITEM: FilesConfigItem = {
  model: DEFAULT_RERANK_MODEL,
  provider: DEFAULT_RERANK_PROVIDER,
};

export const DEFAULT_FILES_CONFIG: FilesConfig = {
  embeddingModel: DEFAULT_FILE_EMBEDDING_MODEL_ITEM,
  queryMode: DEFAULT_RERANK_QUERY_MODE,
  rerankerModel: DEFAULT_FILE_RERANK_MODEL_ITEM,
};

/**
 * Get dimensions for embedding model
 * Priority: config.dimensions (from env) > fallback (1536 default)
 */
export const getEmbeddingDimensions = (
  embeddingModel: FilesConfigItem,
  fallbackDimensions: number = 1536,
): number => {
  // Use explicit dimensions from config (parsed from env) if provided
  if (embeddingModel.dimensions && embeddingModel.dimensions > 0) {
    return embeddingModel.dimensions;
  }

  // Use fallback (default: 1536 for text-embedding-ada-002 compatibility)
  return fallbackDimensions;
};
