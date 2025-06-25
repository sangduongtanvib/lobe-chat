import { z } from 'zod';

import { fileEnv } from '@/config/file';
import { passwordProcedure, router } from '@/libs/trpc/edge';
import { storageService } from '@/server/modules/Storage';

export const uploadRouter = router({
  createS3PreSignedUrl: passwordProcedure
    .input(z.object({ pathname: z.string() }))
    .mutation(async ({ input }) => {
      // Azure Storage is not compatible with Edge Runtime
      // Use the lambda endpoint instead
      if (fileEnv.STORAGE_PROVIDER === 'azure') {
        throw new Error(
          'Azure Storage is not supported in Edge Runtime. Please use the lambda endpoint instead.',
        );
      }

      return await storageService.createPreSignedUrl(input.pathname);
    }),
});

export type FileRouter = typeof uploadRouter;
