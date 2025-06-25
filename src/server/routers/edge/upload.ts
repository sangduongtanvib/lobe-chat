import { z } from 'zod';

import { passwordProcedure, router } from '@/libs/trpc/edge';
import { storageService } from '@/server/modules/Storage';

export const uploadRouter = router({
  createS3PreSignedUrl: passwordProcedure
    .input(z.object({ pathname: z.string() }))
    .mutation(async ({ input }) => {
      return await storageService.createPreSignedUrl(input.pathname);
    }),
});

export type FileRouter = typeof uploadRouter;
