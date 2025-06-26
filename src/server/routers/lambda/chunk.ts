import { TRPCError } from '@trpc/server';
import { inArray } from 'drizzle-orm/expressions';
import { z } from 'zod';

import { DEFAULT_FILE_EMBEDDING_MODEL_ITEM } from '@/const/settings/knowledge';
import { AsyncTaskModel } from '@/database/models/asyncTask';
import { ChunkModel } from '@/database/models/chunk';
import { EmbeddingModel } from '@/database/models/embedding';
import { FileModel } from '@/database/models/file';
import { MessageModel } from '@/database/models/message';
import { knowledgeBaseFiles } from '@/database/schemas';
import { authedProcedure, router } from '@/libs/trpc/lambda';
import { keyVaults, serverDatabase } from '@/libs/trpc/lambda/middleware';
import { getServerDefaultFilesConfig } from '@/server/globalConfig';
import { initAgentRuntimeWithUserPayload } from '@/server/modules/AgentRuntime';
import { ChunkService } from '@/server/services/chunk';
import { SemanticSearchSchema } from '@/types/rag';

const chunkProcedure = authedProcedure
  .use(serverDatabase)
  .use(keyVaults)
  .use(async (opts) => {
    const { ctx } = opts;

    return opts.next({
      ctx: {
        asyncTaskModel: new AsyncTaskModel(ctx.serverDB, ctx.userId),
        chunkModel: new ChunkModel(ctx.serverDB, ctx.userId),
        chunkService: new ChunkService(ctx.userId),
        embeddingModel: new EmbeddingModel(ctx.serverDB, ctx.userId),
        fileModel: new FileModel(ctx.serverDB, ctx.userId),
        messageModel: new MessageModel(ctx.serverDB, ctx.userId),
      },
    });
  });

export const chunkRouter = router({
  createEmbeddingChunksTask: chunkProcedure
    .input(
      z.object({
        id: z.string(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      try {
        console.log(
          '[createEmbeddingChunksTask] Starting embedding chunks task for file ID:',
          input.id,
        );
        const asyncTaskId = await ctx.chunkService.asyncEmbeddingFileChunks(
          input.id,
          ctx.jwtPayload,
        );
        console.log('[createEmbeddingChunksTask] Task created successfully with ID:', asyncTaskId);

        return { id: asyncTaskId, success: true };
      } catch (error) {
        console.error('[createEmbeddingChunksTask] Error creating embedding chunks task:', error);
        console.error('[createEmbeddingChunksTask] Error details:', {
          fileId: input.id,
          message: (error as any)?.message,
          stack: (error as any)?.stack,
        });
        throw error;
      }
    }),

  createParseFileTask: chunkProcedure
    .input(
      z.object({
        id: z.string(),
        skipExist: z.boolean().optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      try {
        console.log(
          '[createParseFileTask] Starting parse file task for file ID:',
          input.id,
          'skipExist:',
          input.skipExist,
        );
        const asyncTaskId = await ctx.chunkService.asyncParseFileToChunks(
          input.id,
          ctx.jwtPayload,
          input.skipExist,
        );
        console.log('[createParseFileTask] Task created successfully with ID:', asyncTaskId);

        return { id: asyncTaskId, success: true };
      } catch (error) {
        console.error('[createParseFileTask] Error creating parse file task:', error);
        console.error('[createParseFileTask] Error details:', {
          fileId: input.id,
          message: (error as any)?.message,
          skipExist: input.skipExist,
          stack: (error as any)?.stack,
        });
        throw error;
      }
    }),

  getChunksByFileId: chunkProcedure
    .input(
      z.object({
        cursor: z.number().nullish(),
        id: z.string(),
      }),
    )
    .query(async ({ ctx, input }) => {
      return {
        items: await ctx.chunkModel.findByFileId(input.id, input.cursor || 0),
        nextCursor: input.cursor ? input.cursor + 1 : 1,
      };
    }),

  retryParseFileTask: chunkProcedure
    .input(
      z.object({
        id: z.string(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      try {
        console.log('[retryParseFileTask] Starting retry parse file task for file ID:', input.id);
        const result = await ctx.fileModel.findById(input.id);

        if (!result) {
          console.log('[retryParseFileTask] File not found with ID:', input.id);
          return;
        }

        console.log('[retryParseFileTask] File found, existing chunkTaskId:', result.chunkTaskId);

        // 1. delete the previous task if exist
        if (result.chunkTaskId) {
          console.log('[retryParseFileTask] Deleting previous task:', result.chunkTaskId);
          await ctx.asyncTaskModel.delete(result.chunkTaskId);
        }

        // 2. create a new asyncTask for chunking
        const asyncTaskId = await ctx.chunkService.asyncParseFileToChunks(input.id, ctx.jwtPayload);
        console.log('[retryParseFileTask] New task created successfully with ID:', asyncTaskId);

        return { id: asyncTaskId, success: true };
      } catch (error) {
        console.error('[retryParseFileTask] Error retrying parse file task:', error);
        console.error('[retryParseFileTask] Error details:', {
          fileId: input.id,
          message: (error as any)?.message,
          stack: (error as any)?.stack,
        });
        throw error;
      }
    }),

  semanticSearch: chunkProcedure
    .input(
      z.object({
        fileIds: z.array(z.string()).optional(),
        query: z.string(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      try {
        console.log('[semanticSearch] Starting embedding process for query:', input.query);
        const { model, provider } =
          getServerDefaultFilesConfig().embeddingModel || DEFAULT_FILE_EMBEDDING_MODEL_ITEM;
        console.log('[semanticSearch] Using model:', model, 'provider:', provider);

        const agentRuntime = await initAgentRuntimeWithUserPayload(provider, ctx.jwtPayload);
        console.log('[semanticSearch] AgentRuntime initialized successfully');

        const embeddings = await agentRuntime.embeddings({
          dimensions: 1024,
          input: input.query,
          model,
        });
        console.log(
          '[semanticSearch] Embeddings generated successfully, length:',
          embeddings?.length,
        );
        console.timeEnd('embedding');

        const result = await ctx.chunkModel.semanticSearch({
          embedding: embeddings![0],
          fileIds: input.fileIds,
          query: input.query,
        });
        console.log(
          '[semanticSearch] Semantic search completed successfully, results count:',
          result?.length || 0,
        );

        return result;
      } catch (error) {
        console.error('[semanticSearch] Error during embedding process:', error);
        console.error('[semanticSearch] Error details:', {
          fileIds: input.fileIds,
          message: (error as any)?.message,
          name: (error as any)?.name,
          query: input.query,
          stack: (error as any)?.stack,
        });
        throw error;
      }
    }),

  semanticSearchForChat: chunkProcedure
    .input(SemanticSearchSchema)
    .mutation(async ({ ctx, input }) => {
      try {
        console.log('[semanticSearchForChat] Starting search for messageId:', input.messageId);
        const item = await ctx.messageModel.findMessageQueriesById(input.messageId);
        console.log('[semanticSearchForChat] Message query found:', !!item);

        const { model, provider } =
          getServerDefaultFilesConfig().embeddingModel || DEFAULT_FILE_EMBEDDING_MODEL_ITEM;
        console.log('[semanticSearchForChat] Using model:', model, 'provider:', provider);

        let embedding: number[];
        let ragQueryId: string;

        // if there is no message rag or it's embeddings, then we need to create one
        if (!item || !item.embeddings) {
          console.log(
            '[semanticSearchForChat] Creating new embeddings for query:',
            input.rewriteQuery?.slice(0, 100) + '...',
          );
          // TODO: need to support customize
          const agentRuntime = await initAgentRuntimeWithUserPayload(provider, ctx.jwtPayload);
          console.log('[semanticSearchForChat] AgentRuntime initialized successfully');

          // slice content to make sure in the context window limit
          const query =
            input.rewriteQuery.length > 8000
              ? input.rewriteQuery.slice(0, 8000)
              : input.rewriteQuery;
          console.log('[semanticSearchForChat] Query length after truncation:', query.length);

          const embeddings = await agentRuntime.embeddings({
            dimensions: 1024,
            input: query,
            model,
          });
          console.log(
            '[semanticSearchForChat] Embeddings generated successfully, length:',
            embeddings?.length,
          );

          embedding = embeddings![0];
          const embeddingsId = await ctx.embeddingModel.create({
            embeddings: embedding,
            model,
          });
          console.log('[semanticSearchForChat] Embeddings saved with ID:', embeddingsId);

          const result = await ctx.messageModel.createMessageQuery({
            embeddingsId,
            messageId: input.messageId,
            rewriteQuery: input.rewriteQuery,
            userQuery: input.userQuery,
          });
          console.log('[semanticSearchForChat] Message query created with ID:', result.id);

          ragQueryId = result.id;
        } else {
          console.log('[semanticSearchForChat] Using existing embeddings');
          embedding = item.embeddings;
          ragQueryId = item.id;
        }

        let finalFileIds = input.fileIds ?? [];

        if (input.knowledgeIds && input.knowledgeIds.length > 0) {
          console.log(
            '[semanticSearchForChat] Processing knowledge IDs:',
            input.knowledgeIds.length,
          );
          const knowledgeFiles = await ctx.serverDB.query.knowledgeBaseFiles.findMany({
            where: inArray(knowledgeBaseFiles.knowledgeBaseId, input.knowledgeIds),
          });
          console.log('[semanticSearchForChat] Found knowledge files:', knowledgeFiles.length);

          finalFileIds = knowledgeFiles.map((f) => f.fileId).concat(finalFileIds);
        }
        console.log('[semanticSearchForChat] Final file IDs count:', finalFileIds.length);

        const chunks = await ctx.chunkModel.semanticSearchForChat({
          embedding,
          fileIds: finalFileIds,
          query: input.rewriteQuery,
        });
        console.log(
          '[semanticSearchForChat] Search completed successfully, chunks found:',
          chunks?.length || 0,
        );

        // TODO: need to rerank the chunks

        return { chunks, queryId: ragQueryId };
      } catch (e) {
        console.error('[semanticSearchForChat] Error during embedding process:', e);
        console.error('[semanticSearchForChat] Error details:', {
          fileIds: input.fileIds,
          knowledgeIds: input.knowledgeIds,
          message: (e as any)?.message,
          messageId: input.messageId,
          name: (e as any)?.name,
          rewriteQuery: input.rewriteQuery?.slice(0, 100) + '...',
          stack: (e as any)?.stack,
        });

        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: (e as any).errorType || JSON.stringify(e),
        });
      }
    }),
});
