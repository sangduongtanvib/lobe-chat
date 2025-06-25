import { beforeEach, describe, expect, it, vi } from 'vitest';

import { fileEnv } from '@/config/file';
import { edgeClient, lambdaClient } from '@/libs/trpc/client';
import { uploadService } from '@/services/upload';

// Mock environment and clients
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

// Mock XMLHttpRequest for upload simulation
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

describe('Upload Integration - Azure Storage End-to-End', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(fileEnv).STORAGE_PROVIDER = 'azure';
  });

  describe('Client-side routing to correct endpoint', () => {
    it('should route Azure uploads to lambda endpoint', async () => {
      const mockAzureSasUrl =
        'https://mystorageaccount.blob.core.windows.net/container/files/123456/document.pdf?sv=2023-01-03&se=2024-12-31T23%3A59%3A59Z&sr=b&sp=cw&sig=azure123';

      // Setup Azure provider
      vi.mocked(fileEnv).STORAGE_PROVIDER = 'azure';
      vi.mocked(lambdaClient.upload.createS3PreSignedUrl.mutate).mockResolvedValue(mockAzureSasUrl);

      // Mock successful upload
      mockXHR.addEventListener = vi.fn((event, callback) => {
        if (event === 'load') {
          setTimeout(() => callback(), 10);
        }
      });

      const testFile = new File(['PDF content'], 'document.pdf', {
        type: 'application/pdf',
      });

      const result = await uploadService.uploadFileToS3(testFile, {
        directory: 'documents',
      });

      // Verify lambda client was used (not edge client)
      expect(lambdaClient.upload.createS3PreSignedUrl.mutate).toHaveBeenCalledWith({
        pathname: expect.stringMatching(/documents\/\d+\/.*\.pdf$/),
      });
      expect(edgeClient.upload.createS3PreSignedUrl.mutate).not.toHaveBeenCalled();

      // Verify upload succeeded
      expect(result.success).toBe(true);
      expect(result.data.filename).toMatch(/.*\.pdf$/);
    });

    it('should route S3 uploads to edge endpoint', async () => {
      const mockS3Url =
        'https://s3.amazonaws.com/my-bucket/files/123456/image.jpg?AWSAccessKeyId=ABC&Expires=123&Signature=xyz';

      // Setup S3 provider
      vi.mocked(fileEnv).STORAGE_PROVIDER = 's3';
      vi.mocked(edgeClient.upload.createS3PreSignedUrl.mutate).mockResolvedValue(mockS3Url);

      // Mock successful upload
      mockXHR.addEventListener = vi.fn((event, callback) => {
        if (event === 'load') {
          setTimeout(() => callback(), 10);
        }
      });

      const testFile = new File(['Image data'], 'image.jpg', {
        type: 'image/jpeg',
      });

      const result = await uploadService.uploadFileToS3(testFile, {
        directory: 'images',
      });

      // Verify edge client was used (not lambda client)
      expect(edgeClient.upload.createS3PreSignedUrl.mutate).toHaveBeenCalledWith({
        pathname: expect.stringMatching(/images\/\d+\/.*\.jpg$/),
      });
      expect(lambdaClient.upload.createS3PreSignedUrl.mutate).not.toHaveBeenCalled();

      // Verify upload succeeded
      expect(result.success).toBe(true);
      expect(result.data.filename).toMatch(/.*\.jpg$/);
    });
  });

  describe('Error handling scenarios', () => {
    it('should handle Azure SAS token expiration', async () => {
      vi.mocked(fileEnv).STORAGE_PROVIDER = 'azure';
      vi.mocked(lambdaClient.upload.createS3PreSignedUrl.mutate).mockRejectedValue(
        new Error('SAS token has expired'),
      );

      const testFile = new File(['Test'], 'test.txt', { type: 'text/plain' });

      await expect(uploadService.uploadFileToS3(testFile, {})).rejects.toThrow(
        'SAS token has expired',
      );
    });

    it('should handle Azure container access denied', async () => {
      const mockExpiredSasUrl =
        'https://mystorageaccount.blob.core.windows.net/container/test.txt?sv=2023-01-03&sig=expired';

      vi.mocked(fileEnv).STORAGE_PROVIDER = 'azure';
      vi.mocked(lambdaClient.upload.createS3PreSignedUrl.mutate).mockResolvedValue(
        mockExpiredSasUrl,
      );

      // Mock Azure 403 Forbidden response
      mockXHR.status = 403;
      mockXHR.statusText = 'Forbidden';
      mockXHR.addEventListener = vi.fn((event, callback) => {
        if (event === 'load') {
          setTimeout(() => callback(), 10);
        }
      });

      const testFile = new File(['Test'], 'test.txt', { type: 'text/plain' });

      await expect(uploadService.uploadFileToS3(testFile, {})).rejects.toThrow('Forbidden');
    });

    it('should handle network connectivity issues', async () => {
      const mockAzureUrl = 'https://mystorageaccount.blob.core.windows.net/container/test.txt';

      vi.mocked(fileEnv).STORAGE_PROVIDER = 'azure';
      vi.mocked(lambdaClient.upload.createS3PreSignedUrl.mutate).mockResolvedValue(mockAzureUrl);

      // Mock network error
      mockXHR.status = 0;
      mockXHR.addEventListener = vi.fn((event, callback) => {
        if (event === 'error') {
          setTimeout(() => callback(), 10);
        }
      });

      const testFile = new File(['Test'], 'test.txt', { type: 'text/plain' });

      await expect(uploadService.uploadFileToS3(testFile, {})).rejects.toBe('NetWorkError');
    });
  });

  describe('Azure-specific upload scenarios', () => {
    it('should handle large file uploads with progress tracking', async () => {
      const mockAzureUrl =
        'https://mystorageaccount.blob.core.windows.net/container/large-file.zip';
      const progressCallback = vi.fn();

      vi.mocked(fileEnv).STORAGE_PROVIDER = 'azure';
      vi.mocked(lambdaClient.upload.createS3PreSignedUrl.mutate).mockResolvedValue(mockAzureUrl);

      // Mock large file (10MB simulation)
      const largeFileContent = new Array(10 * 1024 * 1024).fill('a').join('');
      const largeFile = new File([largeFileContent], 'large-file.zip', {
        type: 'application/zip',
      });

      // Mock progress events
      mockXHR.upload.addEventListener = vi.fn((event, callback) => {
        if (event === 'progress') {
          setTimeout(() => {
            // Simulate 25% progress
            callback({
              lengthComputable: true,
              loaded: 2.5 * 1024 * 1024,
              total: 10 * 1024 * 1024,
            });
          }, 10);
          setTimeout(() => {
            // Simulate 75% progress
            callback({
              lengthComputable: true,
              loaded: 7.5 * 1024 * 1024,
              total: 10 * 1024 * 1024,
            });
          }, 20);
        }
      });

      mockXHR.addEventListener = vi.fn((event, callback) => {
        if (event === 'load') {
          setTimeout(() => callback(), 50);
        }
      });

      await uploadService.uploadFileToS3(largeFile, {
        onProgress: progressCallback,
      });

      // Verify progress was tracked
      expect(progressCallback).toHaveBeenCalledWith('uploading', {
        progress: 25,
        restTime: expect.any(Number),
        speed: expect.any(Number),
      });

      expect(progressCallback).toHaveBeenCalledWith('uploading', {
        progress: 75,
        restTime: expect.any(Number),
        speed: expect.any(Number),
      });

      expect(progressCallback).toHaveBeenCalledWith('success', {
        progress: 100,
        restTime: 0,
        speed: expect.any(Number),
      });
    });

    it('should handle different Azure blob types correctly', async () => {
      vi.mocked(fileEnv).STORAGE_PROVIDER = 'azure';

      const testCases = [
        {
          file: new File(['Image data'], 'photo.jpg', { type: 'image/jpeg' }),
          expectedUrl: 'https://mystorageaccount.blob.core.windows.net/images/photo.jpg',
        },
        {
          file: new File(['Video data'], 'movie.mp4', { type: 'video/mp4' }),
          expectedUrl: 'https://mystorageaccount.blob.core.windows.net/videos/movie.mp4',
        },
        {
          file: new File(['Document'], 'report.pdf', { type: 'application/pdf' }),
          expectedUrl: 'https://mystorageaccount.blob.core.windows.net/documents/report.pdf',
        },
      ];

      for (const testCase of testCases) {
        vi.mocked(lambdaClient.upload.createS3PreSignedUrl.mutate).mockResolvedValue(
          testCase.expectedUrl + '?sv=2023-01-03&sig=test123',
        );

        mockXHR.addEventListener = vi.fn((event, callback) => {
          if (event === 'load') {
            setTimeout(() => callback(), 10);
          }
        });

        const result = await uploadService.uploadFileToS3(testCase.file, {});

        expect(result.success).toBe(true);
        expect(lambdaClient.upload.createS3PreSignedUrl.mutate).toHaveBeenCalled();
      }
    });
  });

  describe('Runtime environment verification', () => {
    it('should verify Azure works in lambda runtime context', async () => {
      // This test verifies the fix for "document is not defined" error
      const mockAzureUrl =
        'https://mystorageaccount.blob.core.windows.net/container/runtime-test.txt';

      vi.mocked(fileEnv).STORAGE_PROVIDER = 'azure';
      vi.mocked(lambdaClient.upload.createS3PreSignedUrl.mutate).mockResolvedValue(mockAzureUrl);

      mockXHR.addEventListener = vi.fn((event, callback) => {
        if (event === 'load') {
          setTimeout(() => callback(), 10);
        }
      });

      const testFile = new File(['Node.js runtime test'], 'runtime-test.txt', {
        type: 'text/plain',
      });

      // This should NOT throw "document is not defined" error
      const result = await uploadService.uploadFileToS3(testFile, {});

      expect(result.success).toBe(true);
      expect(lambdaClient.upload.createS3PreSignedUrl.mutate).toHaveBeenCalledWith({
        pathname: expect.stringMatching(/files\/\d+\/.*\.txt$/),
      });
    });

    it('should demonstrate the client routing fix', async () => {
      // Test switching between providers
      const testFile = new File(['Test'], 'test.txt', { type: 'text/plain' });

      // Test Azure routing
      vi.mocked(fileEnv).STORAGE_PROVIDER = 'azure';
      vi.mocked(lambdaClient.upload.createS3PreSignedUrl.mutate).mockResolvedValue('azure-url');

      mockXHR.addEventListener = vi.fn((event, callback) => {
        if (event === 'load') setTimeout(() => callback(), 5);
      });

      await uploadService.uploadFileToS3(testFile, {});
      expect(lambdaClient.upload.createS3PreSignedUrl.mutate).toHaveBeenCalled();
      expect(edgeClient.upload.createS3PreSignedUrl.mutate).not.toHaveBeenCalled();

      // Reset mocks
      vi.clearAllMocks();

      // Test S3 routing
      vi.mocked(fileEnv).STORAGE_PROVIDER = 's3';
      vi.mocked(edgeClient.upload.createS3PreSignedUrl.mutate).mockResolvedValue('s3-url');

      await uploadService.uploadFileToS3(testFile, {});
      expect(edgeClient.upload.createS3PreSignedUrl.mutate).toHaveBeenCalled();
      expect(lambdaClient.upload.createS3PreSignedUrl.mutate).not.toHaveBeenCalled();
    });
  });
});
