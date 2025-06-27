import OpenAI from 'openai';

import { disableStreamModels, systemToUserModels } from '@/const/models';
import { ChatStreamPayload, OpenAIChatMessage } from '@/libs/model-runtime';
import { imageUrlToBase64 } from '@/utils/imageToBase64';

import { parseDataUri } from './uriParser';

// Helper function to detect Azure Blob Storage URLs
const isAzureBlobUrl = (url: string): boolean => {
  return url.includes('.blob.core.windows.net');
};

// Helper function to modify Azure Blob URL for better preview
const optimizeAzureBlobUrl = (url: string): string => {
  // If it's already a SAS URL with parameters, keep it as is
  if (url.includes('?')) {
    return url;
  }

  // For direct Azure blob URLs, we might need to add inline parameter
  // but this depends on the actual blob configuration
  return url;
};

export const convertMessageContent = async (
  content: OpenAI.ChatCompletionContentPart,
): Promise<OpenAI.ChatCompletionContentPart> => {
  if (content.type === 'image_url') {
    const { type } = parseDataUri(content.image_url.url);

    if (type === 'url') {
      // Special handling for Azure Blob URLs
      if (isAzureBlobUrl(content.image_url.url)) {
        const optimizedUrl = optimizeAzureBlobUrl(content.image_url.url);

        // If LLM_VISION_IMAGE_USE_BASE64 is enabled, convert to base64
        if (process.env.LLM_VISION_IMAGE_USE_BASE64 === '1') {
          try {
            const { base64, mimeType } = await imageUrlToBase64(optimizedUrl);
            return {
              ...content,
              image_url: { ...content.image_url, url: `data:${mimeType};base64,${base64}` },
            };
          } catch (error) {
            console.warn('Failed to convert Azure blob to base64, using original URL:', error);
            return {
              ...content,
              image_url: { ...content.image_url, url: optimizedUrl },
            };
          }
        }

        return {
          ...content,
          image_url: { ...content.image_url, url: optimizedUrl },
        };
      }

      // Standard URL handling for non-Azure URLs
      if (process.env.LLM_VISION_IMAGE_USE_BASE64 === '1') {
        const { base64, mimeType } = await imageUrlToBase64(content.image_url.url);

        return {
          ...content,
          image_url: { ...content.image_url, url: `data:${mimeType};base64,${base64}` },
        };
      }
    }
  }

  return content;
};

export const convertOpenAIMessages = async (messages: OpenAI.ChatCompletionMessageParam[]) => {
  return (await Promise.all(
    messages.map(async (message) => ({
      ...message,
      content:
        typeof message.content === 'string'
          ? message.content
          : await Promise.all(
              (message.content || []).map((c) =>
                convertMessageContent(c as OpenAI.ChatCompletionContentPart),
              ),
            ),
    })),
  )) as OpenAI.ChatCompletionMessageParam[];
};

export const pruneReasoningPayload = (payload: ChatStreamPayload) => {
  return {
    ...payload,
    frequency_penalty: 0,
    messages: payload.messages.map((message: OpenAIChatMessage) => ({
      ...message,
      role:
        message.role === 'system'
          ? systemToUserModels.has(payload.model)
            ? 'user'
            : 'developer'
          : message.role,
    })),
    presence_penalty: 0,
    stream: !disableStreamModels.has(payload.model),
    temperature: 1,
    top_p: 1,
  };
};
