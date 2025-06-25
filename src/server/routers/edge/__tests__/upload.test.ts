import { beforeEach, describe, expect, it, vi } from 'vitest';

import { fileEnv } from '@/config/file';
import { createCallerFactory } from '@/libs/trpc/edge';
import { createContextInner } from '@/libs/trpc/edge/context';
import { uploadRouter } from '@/server/routers/edge/upload';

// Mock dependencies
vi.mock('@/config/file', () => ({
  fileEnv: {
    STORAGE_PROVIDER: 's3',
  },
}));

vi.mock('@/server/modules/Storage', () => ({
  storageService: {
    createPreSignedUrl: vi.fn(),
  },
}));

vi.mock('@/libs/next-auth/edge', () => ({
  auth: vi.fn().mockResolvedValue({
    user: { id: 'test-user' },
  }),
}));

vi.mock('@/utils/server/jwt', () => ({
  getJWTPayload: vi.fn().mockResolvedValue({
    accessCode: 'valid-code',
  }),
}));

describe('Edge Upload Router - Azure Protection', () => {
  const createCaller = createCallerFactory(uploadRouter);
  let caller: ReturnType<typeof createCaller>;

  beforeEach(async () => {
    vi.clearAllMocks();
    const ctx = await createContextInner({
      authorizationHeader: 'Bearer valid-token',
    });
    caller = createCaller(ctx);
  });

  describe('createS3PreSignedUrl', () => {
    it('should throw error when STORAGE_PROVIDER is azure', async () => {
      // Mock Azure storage provider
      vi.mocked(fileEnv).STORAGE_PROVIDER = 'azure';

      await expect(caller.createS3PreSignedUrl({ pathname: 'test/file.txt' })).rejects.toThrow(
        'Azure Storage is not supported in Edge Runtime. Please use the lambda endpoint instead.',
      );
    });

    it('should work normally when STORAGE_PROVIDER is s3', async () => {
      const { storageService } = await import('@/server/modules/Storage');
      const mockPreSignedUrl = 'https://s3.amazonaws.com/bucket/test/file.txt?signature=abc123';

      // Mock S3 storage provider
      vi.mocked(fileEnv).STORAGE_PROVIDER = 's3';
      vi.mocked(storageService.createPreSignedUrl).mockResolvedValue(mockPreSignedUrl);

      const result = await caller.createS3PreSignedUrl({ pathname: 'test/file.txt' });

      expect(result).toBe(mockPreSignedUrl);
      expect(storageService.createPreSignedUrl).toHaveBeenCalledWith('test/file.txt');
    });

    it('should validate input pathname', async () => {
      vi.mocked(fileEnv).STORAGE_PROVIDER = 's3';

      await expect(
        // @ts-ignore - Testing invalid input
        caller.createS3PreSignedUrl({ pathname: 123 }),
      ).rejects.toThrow();

      await expect(
        // @ts-ignore - Testing missing input
        caller.createS3PreSignedUrl({}),
      ).rejects.toThrow();
    });

    it('should handle storage service errors', async () => {
      const { storageService } = await import('@/server/modules/Storage');

      vi.mocked(fileEnv).STORAGE_PROVIDER = 's3';
      vi.mocked(storageService.createPreSignedUrl).mockRejectedValue(
        new Error('S3 bucket not found'),
      );

      await expect(caller.createS3PreSignedUrl({ pathname: 'test/file.txt' })).rejects.toThrow(
        'S3 bucket not found',
      );
    });
  });

  describe('Runtime environment checks', () => {
    it('should prevent Azure usage with clear error message', async () => {
      vi.mocked(fileEnv).STORAGE_PROVIDER = 'azure';

      try {
        await caller.createS3PreSignedUrl({ pathname: 'azure/test.txt' });
        expect.fail('Should have thrown an error');
      } catch (error) {
        expect(error).toBeInstanceOf(Error);
        expect((error as Error).message).toContain(
          'Azure Storage is not supported in Edge Runtime',
        );
        expect((error as Error).message).toContain('lambda endpoint instead');
      }
    });

    it('should work with different S3-compatible providers', async () => {
      const { storageService } = await import('@/server/modules/Storage');
      const mockPreSignedUrl = 'https://minio.example.com/bucket/test.txt?signature=xyz789';

      vi.mocked(fileEnv).STORAGE_PROVIDER = 's3';
      vi.mocked(storageService.createPreSignedUrl).mockResolvedValue(mockPreSignedUrl);

      const result = await caller.createS3PreSignedUrl({
        pathname: 'minio/test.txt',
      });

      expect(result).toBe(mockPreSignedUrl);
      expect(storageService.createPreSignedUrl).toHaveBeenCalledWith('minio/test.txt');
    });
  });

  describe('Authentication and authorization', () => {
    it('should require authentication', async () => {
      const createCallerUnauthenticated = createCallerFactory(uploadRouter);
      const ctxUnauth = await createContextInner({});
      const callerUnauth = createCallerUnauthenticated(ctxUnauth);

      vi.mocked(fileEnv).STORAGE_PROVIDER = 's3';

      await expect(
        callerUnauth.createS3PreSignedUrl({ pathname: 'test/file.txt' }),
      ).rejects.toThrow(); // Should throw authentication error
    });

    it('should validate JWT payload', async () => {
      const { getJWTPayload } = await import('@/utils/server/jwt');

      // Mock invalid JWT
      vi.mocked(getJWTPayload).mockRejectedValue(new Error('Invalid token'));

      const ctx = await createContextInner({
        authorizationHeader: 'Bearer invalid-token',
      });
      const callerInvalidToken = createCaller(ctx);

      vi.mocked(fileEnv).STORAGE_PROVIDER = 's3';

      await expect(
        callerInvalidToken.createS3PreSignedUrl({ pathname: 'test/file.txt' }),
      ).rejects.toThrow(); // Should throw JWT validation error
    });
  });
});
