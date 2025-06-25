import { z } from 'zod';

import { authedProcedure, router } from '@/libs/trpc/lambda';
import { storageService } from '@/server/modules/Storage';

export const uploadRouter = router({
  createS3PreSignedUrl: authedProcedure
    .input(z.object({ pathname: z.string() }))
    .mutation(async ({ input }) => {
      return await storageService.createPreSignedUrl(input.pathname);
    }),
});

export type UploadRouter = typeof uploadRouter;
