import { ModelProvider } from '@/libs/model-runtime';
import { genUserLLMConfig } from '@/utils/genUserLLMConfig';

export const DEFAULT_LLM_CONFIG = genUserLLMConfig({
  lmstudio: {
    fetchOnClient: true,
  },
  ollama: {
    enabled: true,
    fetchOnClient: true,
  },
  openai: {
    enabled: true,
  },
});

export const DEFAULT_MODEL = 'gpt-4.1-mini';

// Use Azure OpenAI for embedding
export const DEFAULT_EMBEDDING_MODEL = 'text-embedding-ada-002'; // Your deployment name from Azure
export const DEFAULT_EMBEDDING_PROVIDER = ModelProvider.Azure; // Changed to Azure

export const DEFAULT_RERANK_MODEL = 'rerank-english-v3.0';
export const DEFAULT_RERANK_PROVIDER = 'cohere';
export const DEFAULT_RERANK_QUERY_MODE = 'full_text';

export const DEFAULT_PROVIDER = ModelProvider.OpenAI;
