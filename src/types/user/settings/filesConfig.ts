export interface FilesConfigItem {
  dimensions?: number;
  model: string;
  provider: string;
}
export interface FilesConfig {
  embeddingModel: FilesConfigItem;
  queryMode: string;
  rerankerModel: FilesConfigItem;
}
