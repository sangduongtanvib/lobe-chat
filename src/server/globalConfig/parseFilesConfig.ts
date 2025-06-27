import { DEFAULT_FILES_CONFIG } from '@/const/settings/knowledge';
import { SystemEmbeddingConfig } from '@/types/knowledgeBase';
import { FilesConfig } from '@/types/user/settings/filesConfig';

const protectedKeys = Object.keys({
  dimensions: null,
  embedding_model: null,
  query_mode: null,
  reranker_model: null,
});

export const parseFilesConfig = (envString: string = ''): SystemEmbeddingConfig => {
  if (!envString) return DEFAULT_FILES_CONFIG;
  const config: FilesConfig = {} as any;

  // 处理全角逗号和多余空格
  let envValue = envString.replaceAll('，', ',').trim();

  const pairs = envValue.split(',');

  for (const pair of pairs) {
    const [key, value] = pair.split('=').map((s) => s.trim());

    if (key && value) {
      const [provider, ...modelParts] = value.split('/');
      const model = modelParts.join('/');

      if (protectedKeys.includes(key)) {
        switch (key) {
          case 'embedding_model': {
            if (!provider || !model) {
              throw new Error(
                'Invalid environment variable format.  expected of the form embedding_model=provider/model',
              );
            }
            config.embeddingModel = { model: model.trim(), provider: provider.trim() };

            // Apply pending dimensions if exists
            if ((config as any).pendingDimensions) {
              config.embeddingModel.dimensions = (config as any).pendingDimensions;
              delete (config as any).pendingDimensions;
            }
            break;
          }
          case 'reranker_model': {
            if (!provider || !model) {
              throw new Error(
                'Invalid environment variable format.  expected of the form reranker_model=provider/model',
              );
            }
            config.rerankerModel = { model: model.trim(), provider: provider.trim() };
            break;
          }
          case 'query_mode': {
            config.queryMode = value;
            break;
          }
          case 'dimensions': {
            const dimensionsValue = parseInt(value, 10);
            if (isNaN(dimensionsValue) || dimensionsValue <= 0) {
              throw new Error('Invalid dimensions value. Expected a positive integer.');
            }

            // If embedding model already exists, apply dimensions directly
            if (config.embeddingModel) {
              config.embeddingModel.dimensions = dimensionsValue;
            } else {
              // Store dimensions for later use when embedding_model is parsed
              (config as any).pendingDimensions = dimensionsValue;
            }
            break;
          }
          default: {
            throw new Error(
              'Invalid environment variable format. expected one of embedding_model, reranker_model, query_mode, dimensions',
            );
          }
        }
      }
    } else {
      throw new Error('Invalid environment variable format.');
    }
  }
  return config;
};
