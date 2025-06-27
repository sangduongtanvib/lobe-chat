import { parseFilesConfig } from '@/server/globalConfig/parseFilesConfig';

/**
 * Get embedding dimensions from environment configuration
 * This ensures database schema uses the same dimensions as the embedding model
 */
export const getDbEmbeddingDimensions = (): number => {
  const envConfig = process.env.DEFAULT_FILES_CONFIG;

  if (envConfig) {
    try {
      const config = parseFilesConfig(envConfig);
      if (config.embeddingModel?.dimensions) {
        return config.embeddingModel.dimensions;
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      console.warn('Failed to parse embedding dimensions from env config:', errorMessage);
    }
  }

  // Fallback to 1536 for text-embedding-ada-002 compatibility
  return 1536;
};

// Cache the dimensions value to avoid repeated parsing
export const DB_EMBEDDING_DIMENSIONS = getDbEmbeddingDimensions();
