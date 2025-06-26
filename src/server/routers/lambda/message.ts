import { z } from 'zod';

import { MessageModel } from '@/database/models/message';
import { updateMessagePluginSchema } from '@/database/schemas';
import { getServerDB } from '@/database/server';
import { authedProcedure, publicProcedure, router } from '@/libs/trpc/lambda';
import { serverDatabase } from '@/libs/trpc/lambda/middleware';
import { FileService } from '@/server/services/file';
import { ChatMessage } from '@/types/message';
import { BatchTaskResult } from '@/types/service';

type ChatMessageList = ChatMessage[];

const messageProcedure = authedProcedure.use(serverDatabase).use(async (opts) => {
  const { ctx } = opts;

  return opts.next({
    ctx: {
      fileService: new FileService(ctx.serverDB, ctx.userId),
      messageModel: new MessageModel(ctx.serverDB, ctx.userId),
    },
  });
});

export const messageRouter = router({
  batchCreateMessages: messageProcedure
    .input(z.array(z.any()))
    .mutation(async ({ input, ctx }): Promise<BatchTaskResult> => {
      try {
        console.log('[batchCreateMessages] Creating batch of messages, count:', input.length);

        // Log messages with files
        const messagesWithFiles = input.filter((msg: any) => msg.files && msg.files.length > 0);
        if (messagesWithFiles.length > 0) {
          console.log('[batchCreateMessages] Messages with files:', messagesWithFiles.length);
          messagesWithFiles.forEach((msg: any, index: number) => {
            console.log(`[batchCreateMessages] Message ${index} files:`, {
              files: msg.files.map((file: any) => ({
                id: file.id,
                name: file.name,
                path: file.path,
                type: file.type,
                url: file.url,
              })),
              filesCount: msg.files.length,
              messageIndex: index,
            });
          });
        }

        // Log messages with Azure content
        const messagesWithAzure = input.filter(
          (msg: any) => typeof msg.content === 'string' && msg.content.includes('azure'),
        );
        if (messagesWithAzure.length > 0) {
          console.log(
            '[batchCreateMessages] Messages with Azure content:',
            messagesWithAzure.length,
          );
        }

        const data = await ctx.messageModel.batchCreate(input);
        console.log(
          '[batchCreateMessages] Batch creation completed, rows affected:',
          data.rowCount,
        );

        return { added: data.rowCount as number, ids: [], skips: [], success: true };
      } catch (error) {
        console.error('[batchCreateMessages] Error in batch creation:', error);
        console.error('[batchCreateMessages] Error details:', {
          inputCount: input.length,
          inputSample: input.slice(0, 2),
          message: (error as any)?.message,
          stack: (error as any)?.stack, // Log first 2 messages as sample
        });
        throw error;
      }
    }),

  count: messageProcedure
    .input(
      z
        .object({
          endDate: z.string().optional(),
          range: z.tuple([z.string(), z.string()]).optional(),
          startDate: z.string().optional(),
        })
        .optional(),
    )
    .query(async ({ ctx, input }) => {
      return ctx.messageModel.count(input);
    }),

  countWords: messageProcedure
    .input(
      z
        .object({
          endDate: z.string().optional(),
          range: z.tuple([z.string(), z.string()]).optional(),
          startDate: z.string().optional(),
        })
        .optional(),
    )
    .query(async ({ ctx, input }) => {
      return ctx.messageModel.countWords(input);
    }),

  createMessage: messageProcedure
    .input(z.object({}).passthrough().partial())
    .mutation(async ({ input, ctx }) => {
      try {
        console.log('[createMessage] Creating message with input:', JSON.stringify(input, null, 2));

        // Log file-related information if present
        if (input.files && Array.isArray(input.files)) {
          console.log('[createMessage] Files attached:', input.files.length);
          input.files.forEach((file: any, index: number) => {
            console.log(`[createMessage] File ${index}:`, {
              id: file.id,
              name: file.name,
              path: file.path,
              size: file.size,
              type: file.type,
              url: file.url,
            });
          });
        }

        // Log content if it contains file references
        if (input.content) {
          console.log(
            '[createMessage] Message content length:',
            (input.content as any)?.length || 'unknown',
          );
          if (typeof input.content === 'string' && input.content.includes('azure')) {
            console.log('[createMessage] Content contains Azure references');
          }
        }

        const data = await ctx.messageModel.create(input as any);
        console.log('[createMessage] Message created successfully with ID:', data.id);

        return data.id;
      } catch (error) {
        console.error('[createMessage] Error creating message:', error);
        console.error('[createMessage] Error details:', {
          input: JSON.stringify(input, null, 2),
          message: (error as any)?.message,
          stack: (error as any)?.stack,
        });
        throw error;
      }
    }),

  // TODO: it will be removed in V2
  getAllMessages: messageProcedure.query(async ({ ctx }): Promise<ChatMessageList> => {
    return ctx.messageModel.queryAll() as any;
  }),

  // TODO: it will be removed in V2
  getAllMessagesInSession: messageProcedure
    .input(
      z.object({
        sessionId: z.string().nullable().optional(),
      }),
    )
    .query(async ({ ctx, input }): Promise<ChatMessageList> => {
      return ctx.messageModel.queryBySessionId(input.sessionId) as any;
    }),

  getHeatmaps: messageProcedure.query(async ({ ctx }) => {
    return ctx.messageModel.getHeatmaps();
  }),

  // TODO: 未来这部分方法也需要使用 authedProcedure
  getMessages: publicProcedure
    .input(
      z.object({
        current: z.number().optional(),
        pageSize: z.number().optional(),
        sessionId: z.string().nullable().optional(),
        topicId: z.string().nullable().optional(),
      }),
    )
    .query(async ({ input, ctx }) => {
      try {
        console.log('[getMessages] Fetching messages with params:', JSON.stringify(input, null, 2));

        if (!ctx.userId) {
          console.log('[getMessages] No userId found, returning empty array');
          return [];
        }

        console.log('[getMessages] User ID:', ctx.userId);
        const serverDB = await getServerDB();

        const messageModel = new MessageModel(serverDB, ctx.userId);
        const fileService = new FileService(serverDB, ctx.userId);

        const messages = await messageModel.query(input, {
          postProcessUrl: async (path) => {
            try {
              console.log('[getMessages] Processing file URL for path:', path);
              const fullUrl = await fileService.getFullFileUrl(path);
              console.log('[getMessages] Generated full URL:', fullUrl);
              return fullUrl;
            } catch (error) {
              console.error('[getMessages] Error processing file URL:', error);
              console.error('[getMessages] File path that caused error:', path);
              throw error;
            }
          },
        });

        console.log('[getMessages] Retrieved messages count:', messages.length);

        // Log messages with files
        const messagesWithFiles = messages.filter((msg: any) => msg.files && msg.files.length > 0);
        if (messagesWithFiles.length > 0) {
          console.log('[getMessages] Messages with files:', messagesWithFiles.length);
          messagesWithFiles.forEach((msg: any, index: number) => {
            console.log(`[getMessages] Message ${index} with files:`, {
              files: msg.files.map((file: any) => ({
                id: file.id,
                name: file.name,
                path: file.path,
                type: file.type,
                url: file.url,
              })),
              filesCount: msg.files.length,
              messageId: msg.id,
            });
          });
        }

        return messages;
      } catch (error) {
        console.error('[getMessages] Error fetching messages:', error);
        console.error('[getMessages] Error details:', {
          input: JSON.stringify(input, null, 2),
          message: (error as any)?.message,
          stack: (error as any)?.stack,
          userId: ctx.userId,
        });
        throw error;
      }
    }),

  rankModels: messageProcedure.query(async ({ ctx }) => {
    return ctx.messageModel.rankModels();
  }),

  removeAllMessages: messageProcedure.mutation(async ({ ctx }) => {
    return ctx.messageModel.deleteAllMessages();
  }),

  removeMessage: messageProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ input, ctx }) => {
      return ctx.messageModel.deleteMessage(input.id);
    }),

  removeMessageQuery: messageProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ input, ctx }) => {
      return ctx.messageModel.deleteMessageQuery(input.id);
    }),

  removeMessages: messageProcedure
    .input(z.object({ ids: z.array(z.string()) }))
    .mutation(async ({ input, ctx }) => {
      return ctx.messageModel.deleteMessages(input.ids);
    }),

  removeMessagesByAssistant: messageProcedure
    .input(
      z.object({
        sessionId: z.string().nullable().optional(),
        topicId: z.string().nullable().optional(),
      }),
    )
    .mutation(async ({ input, ctx }) => {
      return ctx.messageModel.deleteMessagesBySession(input.sessionId, input.topicId);
    }),

  searchMessages: messageProcedure
    .input(z.object({ keywords: z.string() }))
    .query(async ({ input, ctx }) => {
      return ctx.messageModel.queryByKeyword(input.keywords);
    }),

  update: messageProcedure
    .input(
      z.object({
        id: z.string(),
        value: z.object({}).passthrough().partial(),
      }),
    )
    .mutation(async ({ input, ctx }) => {
      try {
        console.log('[updateMessage] Updating message ID:', input.id);
        console.log('[updateMessage] Update values:', JSON.stringify(input.value, null, 2));

        // Log file-related updates
        if ((input.value as any).files) {
          console.log('[updateMessage] Files being updated:', (input.value as any).files.length);
          (input.value as any).files.forEach((file: any, index: number) => {
            console.log(`[updateMessage] File ${index}:`, {
              id: file.id,
              name: file.name,
              path: file.path,
              type: file.type,
              url: file.url,
            });
          });
        }

        // Log content updates
        if ((input.value as any).content) {
          console.log(
            '[updateMessage] Content being updated, length:',
            (input.value as any).content?.length || 'unknown',
          );
          if (
            typeof (input.value as any).content === 'string' &&
            (input.value as any).content.includes('azure')
          ) {
            console.log('[updateMessage] Content contains Azure references');
          }
        }

        const result = await ctx.messageModel.update(input.id, input.value);
        console.log('[updateMessage] Message updated successfully');

        return result;
      } catch (error) {
        console.error('[updateMessage] Error updating message:', error);
        console.error('[updateMessage] Error details:', {
          message: (error as any)?.message,
          messageId: input.id,
          stack: (error as any)?.stack,
          updateValues: JSON.stringify(input.value, null, 2),
        });
        throw error;
      }
    }),

  updateMessagePlugin: messageProcedure
    .input(
      z.object({
        id: z.string(),
        value: updateMessagePluginSchema.partial(),
      }),
    )
    .mutation(async ({ input, ctx }) => {
      try {
        console.log('[updateMessagePlugin] Updating plugin for message ID:', input.id);
        console.log('[updateMessagePlugin] Plugin values:', JSON.stringify(input.value, null, 2));

        // Log if plugin involves file operations
        if ((input.value as any).arguments) {
          console.log(
            '[updateMessagePlugin] Plugin arguments:',
            JSON.stringify((input.value as any).arguments, null, 2),
          );
        }

        if ((input.value as any).content) {
          console.log(
            '[updateMessagePlugin] Plugin content length:',
            (input.value as any).content?.length || 'unknown',
          );
        }

        const result = await ctx.messageModel.updateMessagePlugin(input.id, input.value);
        console.log('[updateMessagePlugin] Plugin updated successfully');

        return result;
      } catch (error) {
        console.error('[updateMessagePlugin] Error updating message plugin:', error);
        console.error('[updateMessagePlugin] Error details:', {
          message: (error as any)?.message,
          messageId: input.id,
          pluginValues: JSON.stringify(input.value, null, 2),
          stack: (error as any)?.stack,
        });
        throw error;
      }
    }),

  updatePluginError: messageProcedure
    .input(
      z.object({
        id: z.string(),
        value: z.object({}).passthrough().nullable(),
      }),
    )
    .mutation(async ({ input, ctx }) => {
      try {
        console.log('[updatePluginError] Setting plugin error for message ID:', input.id);
        console.log('[updatePluginError] Error value:', JSON.stringify(input.value, null, 2));

        // Log detailed error information
        if (input.value && typeof input.value === 'object') {
          console.log('[updatePluginError] Plugin error details:', {
            errorCode: (input.value as any).code,
            errorMessage: (input.value as any).message,
            errorStack: (input.value as any).stack,
            errorType: (input.value as any).type,
          });
        }

        const result = await ctx.messageModel.updateMessagePlugin(input.id, { error: input.value });
        console.log('[updatePluginError] Plugin error updated successfully');

        return result;
      } catch (error) {
        console.error('[updatePluginError] Error updating plugin error:', error);
        console.error('[updatePluginError] Error details:', {
          errorValue: JSON.stringify(input.value, null, 2),
          message: (error as any)?.message,
          messageId: input.id,
          stack: (error as any)?.stack,
        });
        throw error;
      }
    }),

  updatePluginState: messageProcedure
    .input(
      z.object({
        id: z.string(),
        value: z.object({}).passthrough(),
      }),
    )
    .mutation(async ({ input, ctx }) => {
      return ctx.messageModel.updatePluginState(input.id, input.value);
    }),

  updateTTS: messageProcedure
    .input(
      z.object({
        id: z.string(),
        value: z
          .object({
            contentMd5: z.string().optional(),
            file: z.string().optional(),
            voice: z.string().optional(),
          })
          .or(z.literal(false)),
      }),
    )
    .mutation(async ({ input, ctx }) => {
      if (input.value === false) {
        return ctx.messageModel.deleteMessageTTS(input.id);
      }

      return ctx.messageModel.updateTTS(input.id, input.value);
    }),

  updateTranslate: messageProcedure
    .input(
      z.object({
        id: z.string(),
        value: z
          .object({
            content: z.string().optional(),
            from: z.string().optional(),
            to: z.string(),
          })
          .or(z.literal(false)),
      }),
    )
    .mutation(async ({ input, ctx }) => {
      if (input.value === false) {
        return ctx.messageModel.deleteMessageTranslate(input.id);
      }

      return ctx.messageModel.updateTranslate(input.id, input.value);
    }),
});

export type MessageRouter = typeof messageRouter;
