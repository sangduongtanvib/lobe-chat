import { z } from 'zod';

import { fileEnv } from '@/config/file';

import { StorageInterface } from '../Storage';

export const fileSchema = z.object({
  Key: z.string(),
  LastModified: z.date(),
  Size: z.number(),
});

export const listFileSchema = z.array(fileSchema);

export type FileType = z.infer<typeof fileSchema>;

export class AzureStorage implements StorageInterface {
  private client: any;
  private readonly containerName: string;
  private initialized = false;

  constructor() {
    // Support both connection string and account name/key methods
    if (fileEnv.AZURE_BLOB_CONNECTION_STRING && fileEnv.AZURE_BLOB_CONTAINER_NAME) {
      this.containerName = fileEnv.AZURE_BLOB_CONTAINER_NAME;
    } else if (
      fileEnv.AZURE_STORAGE_ACCOUNT_NAME &&
      fileEnv.AZURE_STORAGE_ACCOUNT_KEY &&
      fileEnv.AZURE_STORAGE_CONTAINER_NAME
    ) {
      this.containerName = fileEnv.AZURE_STORAGE_CONTAINER_NAME;
    } else {
      throw new Error(
        'Azure Storage environment variables are not set completely. Please provide either AZURE_BLOB_CONNECTION_STRING + AZURE_BLOB_CONTAINER_NAME or AZURE_STORAGE_ACCOUNT_NAME + AZURE_STORAGE_ACCOUNT_KEY + AZURE_STORAGE_CONTAINER_NAME',
      );
    }
  }

  private async initialize() {
    if (this.initialized) return;

    try {
      const { BlobServiceClient, StorageSharedKeyCredential } = await import('@azure/storage-blob');

      if (fileEnv.AZURE_BLOB_CONNECTION_STRING) {
        // Use connection string method (preferred)
        this.client = BlobServiceClient.fromConnectionString(fileEnv.AZURE_BLOB_CONNECTION_STRING);
      } else {
        // Use account name/key method
        const sharedKeyCredential = new StorageSharedKeyCredential(
          fileEnv.AZURE_STORAGE_ACCOUNT_NAME!,
          fileEnv.AZURE_STORAGE_ACCOUNT_KEY!,
        );

        this.client = new BlobServiceClient(
          `https://${fileEnv.AZURE_STORAGE_ACCOUNT_NAME}.blob.core.windows.net`,
          sharedKeyCredential,
        );
      }

      this.initialized = true;
    } catch (error) {
      throw new Error(`Failed to initialize Azure Storage: ${error}`);
    }
  }

  public async deleteFile(key: string) {
    await this.initialize();
    const containerClient = this.client.getContainerClient(this.containerName);
    const blobClient = containerClient.getBlobClient(key);

    return blobClient.delete();
  }

  public async deleteFiles(keys: string[]) {
    const deletePromises = keys.map((key) => this.deleteFile(key));
    return Promise.all(deletePromises);
  }

  public async getFileContent(key: string): Promise<string> {
    await this.initialize();
    const containerClient = this.client.getContainerClient(this.containerName);
    const blobClient = containerClient.getBlobClient(key);

    const response = await blobClient.download();

    if (!response.readableStreamBody) {
      throw new Error(`No body in response with ${key}`);
    }

    const chunks: Buffer[] = [];
    for await (const chunk of response.readableStreamBody) {
      chunks.push(chunk instanceof Buffer ? chunk : Buffer.from(chunk));
    }

    return Buffer.concat(chunks).toString();
  }

  public async getFileByteArray(key: string): Promise<Uint8Array> {
    await this.initialize();
    const containerClient = this.client.getContainerClient(this.containerName);
    const blobClient = containerClient.getBlobClient(key);

    const response = await blobClient.download();

    if (!response.readableStreamBody) {
      throw new Error(`No body in response with ${key}`);
    }

    const chunks: Buffer[] = [];
    for await (const chunk of response.readableStreamBody) {
      chunks.push(chunk instanceof Buffer ? chunk : Buffer.from(chunk));
    }

    return new Uint8Array(Buffer.concat(chunks));
  }

  public async createPreSignedUrl(key: string): Promise<string> {
    await this.initialize();
    const { BlobSASPermissions } = await import('@azure/storage-blob');

    const containerClient = this.client.getContainerClient(this.containerName);
    const blobClient = containerClient.getBlockBlobClient(key);

    // Tạo SAS URL cho upload (write permission)
    const permissions = new BlobSASPermissions();
    permissions.write = true;
    permissions.create = true;
    permissions.add = true; // Required for uploading new blobs
    permissions.delete = true; // Required for workspace file management

    const sasUrl = await blobClient.generateSasUrl({
      expiresOn: new Date(Date.now() + 3600 * 1000), // 1 hour
      permissions,
    });

    return sasUrl;
  }

  public async createPreSignedUrlForPreview(key: string, expiresIn?: number): Promise<string> {
    await this.initialize();
    const { BlobSASPermissions } = await import('@azure/storage-blob');

    const containerClient = this.client.getContainerClient(this.containerName);
    const blobClient = containerClient.getBlobClient(key);

    // Get blob properties to determine content type
    let contentType = 'application/octet-stream';
    try {
      const properties = await blobClient.getProperties();
      contentType = properties.contentType || contentType;
    } catch (error) {
      console.warn('Could not get blob properties for content type detection:', error);
    }

    // Tạo SAS URL cho preview (read permission)
    const permissions = new BlobSASPermissions();
    permissions.read = true;

    // Set response headers to ensure proper preview behavior
    const responseHeaders: any = {};

    // Determine if content should be displayed inline
    const previewableTypes = ['image/', 'application/pdf', 'text/', 'video/', 'audio/'];
    const shouldPreview = previewableTypes.some((type) => contentType.startsWith(type));

    if (shouldPreview) {
      responseHeaders['content-disposition'] = 'inline';
    }

    // Always set the correct content type
    responseHeaders['content-type'] = contentType;

    const sasUrl = await blobClient.generateSasUrl({
      contentResponseHeaders: responseHeaders,
      expiresOn: new Date(Date.now() + (expiresIn || fileEnv.S3_PREVIEW_URL_EXPIRE_IN) * 1000),
      permissions,
    });

    return sasUrl;
  }

  public async uploadBuffer(path: string, buffer: Buffer, contentType?: string) {
    await this.initialize();
    const containerClient = this.client.getContainerClient(this.containerName);
    const blockBlobClient = containerClient.getBlockBlobClient(path);

    // If contentType is not provided, detect from file extension
    const finalContentType = contentType || this.getMimeTypeFromPath(path);

    const options: any = {};
    options.blobHTTPHeaders = {
      blobContentDisposition: this.getContentDisposition(finalContentType, path),
      blobContentType: finalContentType,
    };

    console.log(`[AzureStorage] Uploading ${path} with Content-Type: ${finalContentType}`);

    return blockBlobClient.upload(buffer, buffer.length, options);
  }

  private getContentDisposition(contentType?: string, path?: string): string {
    if (!contentType) {
      return 'attachment';
    }

    // For images, PDFs, text files, we want inline display
    const previewableTypes = ['image/', 'application/pdf', 'text/', 'video/', 'audio/'];

    const shouldPreview = previewableTypes.some((type) => contentType.startsWith(type));

    if (shouldPreview) {
      return 'inline';
    }

    // For other types, use attachment with filename
    const filename = path ? path.split('/').pop() : 'file';
    return `attachment; filename="${filename}"`;
  }

  public async uploadContent(path: string, content: string) {
    const buffer = Buffer.from(content, 'utf8');
    return this.uploadBuffer(path, buffer, 'text/plain');
  }

  public getFileUrl(key: string): string {
    // Extract account name from connection string or use env variable
    let accountName = fileEnv.AZURE_STORAGE_ACCOUNT_NAME;

    if (fileEnv.AZURE_BLOB_CONNECTION_STRING && !accountName) {
      const match = fileEnv.AZURE_BLOB_CONNECTION_STRING.match(/AccountName=([^;]+)/);
      accountName = match ? match[1] : 'unknown';
    }

    return `https://${accountName}.blob.core.windows.net/${this.containerName}/${key}`;
  }

  private getMimeTypeFromPath(path: string): string {
    const ext = path.toLowerCase().split('.').pop();

    const mimeTypes: Record<string, string> = {
      // Archives
      '7z': 'application/x-7z-compressed',

      // Video
      'avi': 'video/x-msvideo',

      // Images
      'bmp': 'image/bmp',

      // Text
      'css': 'text/css',

      // Documents
      'doc': 'application/msword',
      'docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',

      // Audio
      'flac': 'audio/flac',

      // Images
      'gif': 'image/gif',

      // Text
      'html': 'text/html',

      // Images
      'ico': 'image/x-icon',

      // Images
      'jpeg': 'image/jpeg',
      'jpg': 'image/jpeg',

      // Text
      'js': 'text/javascript',
      'json': 'application/json',

      // Video
      'mov': 'video/quicktime',

      // Audio
      'mp3': 'audio/mpeg',

      // Video
      'mp4': 'video/mp4',

      // Documents
      'pdf': 'application/pdf',

      // Images
      'png': 'image/png',

      // Documents
      'ppt': 'application/vnd.ms-powerpoint',
      'pptx': 'application/vnd.openxmlformats-officedocument.presentationml.presentation',

      // Archives
      'rar': 'application/x-rar-compressed',

      // Images
      'svg': 'image/svg+xml',

      // Text
      'txt': 'text/plain',

      // Audio
      'wav': 'audio/wav',

      // Images
      'webp': 'image/webp',

      // Video
      'wmv': 'video/x-ms-wmv',

      // Documents
      'xls': 'application/vnd.ms-excel',
      'xlsx': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',

      // Text
      'xml': 'application/xml',

      // Archives
      'zip': 'application/zip',
    };

    return mimeTypes[ext || ''] || 'application/octet-stream';
  }
}
