import isEqual from 'fast-deep-equal';
import { parseAsBoolean, useQueryState } from 'nuqs';
import { useEffect } from 'react';
import { useHotkeysContext } from 'react-hotkeys-hook';

import { useClearCurrentMessages } from '@/features/ChatInput/ActionBar/Clear';
import { useSendMessage } from '@/features/ChatInput/useSend';
import { useOpenChatSettings } from '@/hooks/useInterceptingRoutes';
import { useActionSWR } from '@/libs/swr';
import { useChatStore } from '@/store/chat';
import { chatSelectors } from '@/store/chat/selectors';
import { useGlobalStore } from '@/store/global';
import { systemStatusSelectors } from '@/store/global/selectors';
import { HotkeyEnum, HotkeyScopeEnum } from '@/types/hotkey';

import { useHotkeyById } from './useHotkeyById';

export const useSaveTopicHotkey = () => {
  const openNewTopicOrSaveTopic = useChatStore((s) => s.openNewTopicOrSaveTopic);
  const { mutate } = useActionSWR('openNewTopicOrSaveTopic', openNewTopicOrSaveTopic);
  return useHotkeyById(HotkeyEnum.SaveTopic, () => {
    try {
      mutate();
    } catch (error) {
      console.warn('Save topic hotkey error:', error);
    }
  });
};

export const useToggleZenModeHotkey = () => {
  const toggleZenMode = useGlobalStore((s) => s.toggleZenMode);
  return useHotkeyById(HotkeyEnum.ToggleZenMode, toggleZenMode);
};

export const useOpenChatSettingsHotkey = () => {
  const openChatSettings = useOpenChatSettings();
  return useHotkeyById(HotkeyEnum.OpenChatSettings, () => {
    try {
      openChatSettings();
    } catch (error) {
      console.warn('Open chat settings hotkey error:', error);
    }
  });
};

export const useRegenerateMessageHotkey = () => {
  const regenerateMessage = useChatStore((s) => s.regenerateMessage);
  const lastMessage = useChatStore(chatSelectors.latestMessage, isEqual);

  const disable = !lastMessage || lastMessage.id === 'default' || lastMessage.role === 'system';

  return useHotkeyById(
    HotkeyEnum.RegenerateMessage,
    () => {
      try {
        if (!disable && lastMessage) {
          regenerateMessage(lastMessage.id);
        }
      } catch (error) {
        console.warn('Regenerate message hotkey error:', error);
      }
    },
    {
      enabled: !disable,
    },
  );
};

export const useToggleLeftPanelHotkey = () => {
  const isZenMode = useGlobalStore((s) => s.status.zenMode);
  const [isPinned] = useQueryState('pinned', parseAsBoolean);
  const showSessionPanel = useGlobalStore(systemStatusSelectors.showSessionPanel);
  const updateSystemStatus = useGlobalStore((s) => s.updateSystemStatus);

  return useHotkeyById(
    HotkeyEnum.ToggleLeftPanel,
    () => {
      try {
        updateSystemStatus({
          sessionsWidth: showSessionPanel ? 0 : 320,
          showSessionPanel: !showSessionPanel,
        });
      } catch (error) {
        console.warn('Toggle left panel hotkey error:', error);
      }
    },
    {
      enabled: !isZenMode && !isPinned,
    },
  );
};

export const useToggleRightPanelHotkey = () => {
  const isZenMode = useGlobalStore((s) => s.status.zenMode);
  const toggleConfig = useGlobalStore((s) => s.toggleChatSideBar);

  return useHotkeyById(
    HotkeyEnum.ToggleRightPanel,
    () => {
      try {
        toggleConfig();
      } catch (error) {
        console.warn('Toggle right panel hotkey error:', error);
      }
    },
    {
      enabled: !isZenMode,
    },
  );
};

export const useAddUserMessageHotkey = () => {
  const { send } = useSendMessage();
  return useHotkeyById(HotkeyEnum.AddUserMessage, () => {
    try {
      send({ onlyAddUserMessage: true });
    } catch (error) {
      console.warn('Add user message hotkey error:', error);
    }
  });
};

export const useClearCurrentMessagesHotkey = () => {
  const clearCurrentMessages = useClearCurrentMessages();
  return useHotkeyById(HotkeyEnum.ClearCurrentMessages, () => {
    try {
      clearCurrentMessages();
    } catch (error) {
      console.warn('Clear current messages hotkey error:', error);
    }
  });
};

// 注册聚合

export const useRegisterChatHotkeys = () => {
  const { enableScope, disableScope } = useHotkeysContext();

  // System
  useOpenChatSettingsHotkey();

  // Layout
  useToggleLeftPanelHotkey();
  useToggleRightPanelHotkey();
  useToggleZenModeHotkey();

  // Conversation
  useRegenerateMessageHotkey();
  useSaveTopicHotkey();
  useAddUserMessageHotkey();
  useClearCurrentMessagesHotkey();

  useEffect(() => {
    try {
      enableScope(HotkeyScopeEnum.Chat);
      return () => {
        try {
          disableScope(HotkeyScopeEnum.Chat);
        } catch (error) {
          console.warn('Chat hotkeys cleanup error:', error);
        }
      };
    } catch (error) {
      console.warn('Chat hotkeys scope error:', error);
    }
  }, [enableScope, disableScope]);
};
