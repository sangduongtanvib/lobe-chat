import { beforeEach, describe, expect, it, vi } from 'vitest';

import { fileEnv } from '@/config/file';
import { lambdaClient } from '@/libs/trpc/client';
import { uploadService } from '@/services/upload';

// Mock dependencies
vi.mock('@/config/file', () => ({
  fileEnv: {
    STORAGE_PROVIDER: 'azure',
    NEXT_PUBLIC_S3_FILE_PATH: 'files',
  },
}));

vi.mock('@/libs/trpc/client', () => ({
  lambdaClient: {
    upload: {
      createS3PreSignedUrl: {
        mutate: vi.fn(),
      },
    },
  },
  edgeClient: {
    upload: {
      createS3PreSignedUrl: {
        mutate: vi.fn(),
      },
    },
  },
}));

vi.mock('@/const/version', () => ({
  isDesktop: false,
  isServerMode: true,
}));

// Mock global XMLHttpRequest
const mockXHR = {
  open: vi.fn(),
  send: vi.fn(),
  setRequestHeader: vi.fn(),
  addEventListener: vi.fn(),
  upload: {
    addEventListener: vi.fn(),
  },
  status: 200,
  statusText: 'OK',
  response: 'success',
};

// @ts-ignore
global.XMLHttpRequest = vi.fn(() => mockXHR);

describe('UploadService - Azure Storage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(fileEnv).STORAGE_PROVIDER = 'azure';
  });

  describe('uploadFileToS3 with Azure Storage', () => {
    it('should use lambdaClient for Azure storage provider', async () => {
      const mockFile = new File(['test content'], 'test.txt', { type: 'text/plain' });
      const mockPreSignedUrl =
        'https://mystorageaccount.blob.core.windows.net/container/test.txt?sv=2023-01-03&se=2024-01-01T00%3A00%3A00Z&sr=b&sp=w&sig=abc123';

      // Mock lambda client response
      vi.mocked(lambdaClient.upload.createS3PreSignedUrl.mutate).mockResolvedValue(
        mockPreSignedUrl,
      );

      // Mock successful XHR upload
      mockXHR.addEventListener = vi.fn((event, callback) => {
        if (event === 'load') {
          setTimeout(() => callback(), 10);
        }
      });

      const result = await uploadService.uploadFileToS3(mockFile, {
        directory: 'test-uploads',
      });

      expect(result.success).toBe(true);
      expect(result.data).toBeDefined();
      expect(lambdaClient.upload.createS3PreSignedUrl.mutate).toHaveBeenCalledWith({
        pathname: expect.stringMatching(/test-uploads\/\d+\/.*\.txt$/),
      });
    });

    it('should handle upload progress correctly', async () => {
      const mockFile = new File(['test content'], 'test.txt', { type: 'text/plain' });
      const mockPreSignedUrl = 'https://mystorageaccount.blob.core.windows.net/container/test.txt';
      const mockProgress = vi.fn();

      vi.mocked(lambdaClient.upload.createS3PreSignedUrl.mutate).mockResolvedValue(
        mockPreSignedUrl,
      );

      // Mock XHR progress events
      mockXHR.upload.addEventListener = vi.fn((event, callback) => {
        if (event === 'progress') {
          setTimeout(() => {
            callback({
              lengthComputable: true,
              loaded: 50,
              total: 100,
            });
          }, 10);
        }
      });

      mockXHR.addEventListener = vi.fn((event, callback) => {
        if (event === 'load') {
          setTimeout(() => callback(), 50);
        }
      });

      await uploadService.uploadFileToS3(mockFile, {
        onProgress: mockProgress,
      });

      expect(mockProgress).toHaveBeenCalledWith('uploading', {
        progress: 50,
        restTime: expect.any(Number),
        speed: expect.any(Number),
      });

      expect(mockProgress).toHaveBeenCalledWith('success', {
        progress: 100,
        restTime: 0,
        speed: expect.any(Number),
      });
    });

    it('should handle upload errors correctly', async () => {
      const mockFile = new File(['test content'], 'test.txt', { type: 'text/plain' });
      const mockPreSignedUrl = 'https://mystorageaccount.blob.core.windows.net/container/test.txt';

      vi.mocked(lambdaClient.upload.createS3PreSignedUrl.mutate).mockResolvedValue(
        mockPreSignedUrl,
      );

      // Mock XHR error
      mockXHR.status = 403;
      mockXHR.statusText = 'Forbidden';
      mockXHR.addEventListener = vi.fn((event, callback) => {
        if (event === 'load') {
          setTimeout(() => callback(), 10);
        }
      });

      await expect(uploadService.uploadFileToS3(mockFile, {})).rejects.toThrow('Forbidden');
    });

    it('should handle network errors correctly', async () => {
      const mockFile = new File(['test content'], 'test.txt', { type: 'text/plain' });
      const mockPreSignedUrl = 'https://mystorageaccount.blob.core.windows.net/container/test.txt';

      vi.mocked(lambdaClient.upload.createS3PreSignedUrl.mutate).mockResolvedValue(
        mockPreSignedUrl,
      );

      // Mock XHR network error
      mockXHR.status = 0;
      mockXHR.addEventListener = vi.fn((event, callback) => {
        if (event === 'error') {
          setTimeout(() => callback(), 10);
        }
      });

      await expect(uploadService.uploadFileToS3(mockFile, {})).rejects.toBe('NetWorkError');
    });
  });

  describe('uploadBase64ToS3 with Azure Storage', () => {
    it('should upload base64 image data using Azure Storage', async () => {
      const base64Data =
        'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8/5+hHgAHggJ/PchI7wAAAABJRU5ErkJggg==';
      const mockPreSignedUrl = 'https://mystorageaccount.blob.core.windows.net/container/image.png';

      vi.mocked(lambdaClient.upload.createS3PreSignedUrl.mutate).mockResolvedValue(
        mockPreSignedUrl,
      );

      mockXHR.addEventListener = vi.fn((event, callback) => {
        if (event === 'load') {
          setTimeout(() => callback(), 10);
        }
      });

      const result = await uploadService.uploadBase64ToS3(base64Data, {
        filename: 'test-image',
      });

      expect(result.fileType).toBe('image/png');
      expect(result.metadata).toBeDefined();
      expect(result.metadata.filename).toMatch(/test-image\.png$/);
      expect(lambdaClient.upload.createS3PreSignedUrl.mutate).toHaveBeenCalled();
    });

    it('should handle invalid base64 data', async () => {
      const invalidBase64 = 'invalid-base64-data';

      await expect(uploadService.uploadBase64ToS3(invalidBase64)).rejects.toThrow(
        'Invalid base64 data for image',
      );
    });
  });

  describe('getSignedUploadUrl routing logic', () => {
    it('should use lambdaClient when STORAGE_PROVIDER is azure', async () => {
      const mockFile = new File(['test'], 'test.txt', { type: 'text/plain' });
      const mockPreSignedUrl = 'https://mystorageaccount.blob.core.windows.net/container/test.txt';

      vi.mocked(fileEnv).STORAGE_PROVIDER = 'azure';
      vi.mocked(lambdaClient.upload.createS3PreSignedUrl.mutate).mockResolvedValue(
        mockPreSignedUrl,
      );

      // Access private method for testing
      const uploadServiceAny = uploadService as any;
      const result = await uploadServiceAny.getSignedUploadUrl(mockFile, {
        directory: 'test-dir',
      });

      expect(lambdaClient.upload.createS3PreSignedUrl.mutate).toHaveBeenCalledWith({
        pathname: expect.stringMatching(/test-dir\/\d+\/.*\.txt$/),
      });
      expect(result.preSignUrl).toBe(mockPreSignedUrl);
      expect(result.path).toMatch(/test-dir\/\d+\/.*\.txt$/);
    });

    it('should generate correct pathname structure', async () => {
      const mockFile = new File(['test'], 'document.pdf', { type: 'application/pdf' });
      const mockPreSignedUrl =
        'https://mystorageaccount.blob.core.windows.net/container/document.pdf';

      vi.mocked(lambdaClient.upload.createS3PreSignedUrl.mutate).mockResolvedValue(
        mockPreSignedUrl,
      );

      const uploadServiceAny = uploadService as any;
      const result = await uploadServiceAny.getSignedUploadUrl(mockFile, {
        pathname: 'custom/path/document.pdf',
      });

      expect(lambdaClient.upload.createS3PreSignedUrl.mutate).toHaveBeenCalledWith({
        pathname: 'custom/path/document.pdf',
      });
      expect(result.path).toBe('custom/path/document.pdf');
    });
  });

  describe('uploadDataToS3 with Azure Storage', () => {
    it('should upload JSON data using Azure Storage', async () => {
      const testData = { message: 'Hello Azure', timestamp: Date.now() };
      const mockPreSignedUrl = 'https://mystorageaccount.blob.core.windows.net/container/data.json';

      vi.mocked(lambdaClient.upload.createS3PreSignedUrl.mutate).mockResolvedValue(
        mockPreSignedUrl,
      );

      mockXHR.addEventListener = vi.fn((event, callback) => {
        if (event === 'load') {
          setTimeout(() => callback(), 10);
        }
      });

      const result = await uploadService.uploadDataToS3(testData, {
        filename: 'test-data.json',
      });

      expect(result.success).toBe(true);
      expect(result.data.filename).toBe('test-data.json');
      expect(lambdaClient.upload.createS3PreSignedUrl.mutate).toHaveBeenCalled();
    });
  });
});
