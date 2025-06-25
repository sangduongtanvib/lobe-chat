import { fileEnv } from '@/config/file';

import { AzureStorage } from '../AzureStorage';
import { S3 } from '../S3';

export type FileType = {
  Key: string;
  LastModified: Date;
  Size: number;
};

export interface StorageInterface {
  createPreSignedUrl(key: string): Promise<string>;
  createPreSignedUrlForPreview(key: string, expiresIn?: number): Promise<string>;
  deleteFile(key: string): Promise<any>;
  deleteFiles(keys: string[]): Promise<any>;
  getFileByteArray(key: string): Promise<Uint8Array>;
  getFileContent(key: string): Promise<string>;
  getFileUrl?(key: string): string; // Make optional
  uploadBuffer(path: string, buffer: Buffer, contentType?: string): Promise<any>;
  uploadContent(path: string, content: string): Promise<any>;
}

class StorageService implements StorageInterface {
  private storageClient: StorageInterface | null = null;

  private getStorageClient(): StorageInterface {
    if (this.storageClient) return this.storageClient;

    if (fileEnv.STORAGE_PROVIDER === 'azure') {
      this.storageClient = new AzureStorage();
    } else {
      this.storageClient = new S3();
    }

    return this.storageClient;
  }

  async deleteFile(key: string) {
    return this.getStorageClient().deleteFile(key);
  }

  async deleteFiles(keys: string[]) {
    return this.getStorageClient().deleteFiles(keys);
  }

  async getFileContent(key: string): Promise<string> {
    return this.getStorageClient().getFileContent(key);
  }

  async getFileByteArray(key: string): Promise<Uint8Array> {
    return this.getStorageClient().getFileByteArray(key);
  }

  async createPreSignedUrl(key: string): Promise<string> {
    return this.getStorageClient().createPreSignedUrl(key);
  }

  async createPreSignedUrlForPreview(key: string, expiresIn?: number): Promise<string> {
    return this.getStorageClient().createPreSignedUrlForPreview(key, expiresIn);
  }

  async uploadBuffer(path: string, buffer: Buffer, contentType?: string) {
    return this.getStorageClient().uploadBuffer(path, buffer, contentType);
  }

  async uploadContent(path: string, content: string) {
    return this.getStorageClient().uploadContent(path, content);
  }

  getFileUrl(key: string): string {
    const client = this.getStorageClient();
    if (fileEnv.STORAGE_PROVIDER === 'azure' && client instanceof AzureStorage) {
      return (client as AzureStorage).getFileUrl(key);
    } else if (fileEnv.S3_PUBLIC_DOMAIN && fileEnv.S3_BUCKET) {
      // Xử lý S3 URL
      if (fileEnv.S3_ENABLE_PATH_STYLE) {
        return `${fileEnv.S3_PUBLIC_DOMAIN}/${fileEnv.S3_BUCKET}/${key}`;
      } else {
        return `${fileEnv.S3_PUBLIC_DOMAIN}/${key}`;
      }
    }
    return key; // fallback
  }
}

export const storageService = new StorageService();
