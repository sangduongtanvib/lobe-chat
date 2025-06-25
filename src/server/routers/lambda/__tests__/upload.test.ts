import { beforeEach, describe, expect, it, vi } from 'vitest';

import { createCallerFactory } from '@/libs/trpc/lambda';
import { uploadRouter } from '@/server/routers/lambda/upload';

// Mock all dependencies
vi.mock('@/config/file', () => ({
  fileEnv: {
    STORAGE_PROVIDER: 'azure',
  },
}));

vi.mock('@/config/oidc', () => ({
  oidcEnv: {
    ENABLE_OIDC: false,
  },
}));

vi.mock('@/server/modules/Storage', () => ({
  storageService: {
    createPreSignedUrl: vi.fn(),
  },
}));

vi.mock('@/libs/trpc/lambda/context', () => ({
  createLambdaContext: vi.fn().mockResolvedValue({
    userId: 'test-user',
    sessionId: 'test-session',
  }),
}));

describe('Lambda Upload Router - Azure Support', () => {
  const createCaller = createCallerFactory(uploadRouter);
  let caller: ReturnType<typeof createCaller>;

  beforeEach(async () => {
    vi.clearAllMocks();

    // Create caller with mocked context
    const mockContext = {
      userId: 'test-user',
      sessionId: 'test-session',
    };
    caller = createCaller(mockContext);
  });

  describe('createS3PreSignedUrl', () => {
    it('should work with Azure storage provider', async () => {
      const { storageService } = await import('@/server/modules/Storage');
      const mockAzurePreSignedUrl =
        'https://mystorageaccount.blob.core.windows.net/container/test/file.txt?sv=2023-01-03&se=2024-01-01T00%3A00%3A00Z&sr=b&sp=w&sig=abc123';

      vi.mocked(storageService.createPreSignedUrl).mockResolvedValue(mockAzurePreSignedUrl);

      const result = await caller.createS3PreSignedUrl({
        pathname: 'uploads/2024/01/test-file.pdf',
      });

      expect(result).toBe(mockAzurePreSignedUrl);
      expect(storageService.createPreSignedUrl).toHaveBeenCalledWith(
        'uploads/2024/01/test-file.pdf',
      );
    });

    it('should validate input parameters', async () => {
      const { storageService } = await import('@/server/modules/Storage');

      // Reset mock to ensure clean state for validation tests
      vi.mocked(storageService.createPreSignedUrl).mockClear();

      // Test missing pathname
      await expect(
        // @ts-ignore - Testing invalid input
        caller.createS3PreSignedUrl({}),
      ).rejects.toThrow();

      // Test invalid pathname type
      await expect(
        // @ts-ignore - Testing invalid input
        caller.createS3PreSignedUrl({ pathname: 123 }),
      ).rejects.toThrow();

      // Note: Empty string is valid for zod.string(), so this test should pass
      // Just verify that valid empty string calls storage service
      const emptyStringResult = await caller.createS3PreSignedUrl({ pathname: '' });
      expect(emptyStringResult).toBeDefined();
      expect(storageService.createPreSignedUrl).toHaveBeenCalledWith('');
    });

    it('should handle storage service errors', async () => {
      const { storageService } = await import('@/server/modules/Storage');

      vi.mocked(storageService.createPreSignedUrl).mockRejectedValue(
        new Error('Azure container not found'),
      );

      await expect(caller.createS3PreSignedUrl({ pathname: 'uploads/test.txt' })).rejects.toThrow(
        'Azure container not found',
      );
    });
  });

  describe('Azure-specific functionality', () => {
    it('should generate SAS URLs for Azure blobs', async () => {
      const { storageService } = await import('@/server/modules/Storage');
      const mockSasUrl =
        'https://mystorageaccount.blob.core.windows.net/container/uploads/document.pdf?sv=2023-01-03&se=2024-12-31T23%3A59%3A59Z&sr=b&sp=cw&sig=def456';

      vi.mocked(storageService.createPreSignedUrl).mockResolvedValue(mockSasUrl);

      const result = await caller.createS3PreSignedUrl({
        pathname: 'uploads/documents/presentation.pdf',
      });

      expect(result).toBe(mockSasUrl);
      expect(result).toContain('.blob.core.windows.net');
      expect(result).toContain('sv='); // SAS version
      expect(result).toContain('sig='); // Signature
    });
  });
});
