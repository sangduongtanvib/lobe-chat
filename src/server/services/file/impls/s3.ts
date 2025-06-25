import urlJoin from 'url-join';

import { fileEnv } from '@/config/file';
import { StorageInterface, storageService } from '@/server/modules/Storage';

import { FileServiceImpl } from './type';

/**
 * 基于Storage的文件服务实现 (支持S3和Azure Storage)
 */
export class S3StaticFileImpl implements FileServiceImpl {
  private readonly storage: StorageInterface;

  constructor() {
    this.storage = storageService;
  }

  async deleteFile(key: string) {
    return this.storage.deleteFile(key);
  }

  async deleteFiles(keys: string[]) {
    return this.storage.deleteFiles(keys);
  }

  async getFileContent(key: string): Promise<string> {
    return this.storage.getFileContent(key);
  }

  async getFileByteArray(key: string): Promise<Uint8Array> {
    return this.storage.getFileByteArray(key);
  }

  async createPreSignedUrl(key: string): Promise<string> {
    return this.storage.createPreSignedUrl(key);
  }

  async createPreSignedUrlForPreview(key: string, expiresIn?: number): Promise<string> {
    return this.storage.createPreSignedUrlForPreview(key, expiresIn);
  }

  async uploadContent(path: string, content: string) {
    return this.storage.uploadContent(path, content);
  }

  async getFullFileUrl(url?: string | null, expiresIn?: number): Promise<string> {
    if (!url) return '';

    // If using Azure Storage or S3 without public read ACL, generate pre-signed URL
    if (fileEnv.STORAGE_PROVIDER === 'azure' || !fileEnv.S3_SET_ACL) {
      return await this.createPreSignedUrlForPreview(url, expiresIn);
    }

    // For S3 with public read ACL
    if (fileEnv.S3_ENABLE_PATH_STYLE) {
      return urlJoin(fileEnv.S3_PUBLIC_DOMAIN!, fileEnv.S3_BUCKET!, url);
    }

    return urlJoin(fileEnv.S3_PUBLIC_DOMAIN!, url);
  }
}
