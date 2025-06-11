'use client';

import { useQueryState } from 'nuqs';
import { parseAsString } from 'nuqs/server';
import { memo, useEffect } from 'react';
import { createStoreUpdater } from 'zustand-utils';

import { useFetchSessions } from '@/hooks/useFetchSessions';
import { useAgentStore } from '@/store/agent';
import { useChatStore } from '@/store/chat';
import { useGlobalStore } from '@/store/global';
import { systemStatusSelectors } from '@/store/global/selectors';
import { useSessionStore } from '@/store/session';
import { useUserStore } from '@/store/user';
import { authSelectors } from '@/store/user/slices/auth/selectors';

// sync outside state to useSessionStore
const SessionHydration = memo(() => {
  const useStoreUpdater = createStoreUpdater(useSessionStore);
  const useAgentStoreUpdater = createStoreUpdater(useAgentStore);
  const useChatStoreUpdater = createStoreUpdater(useChatStore);
  const [switchTopic] = useChatStore((s) => [s.switchTopic]);

  // Fetching sessions data early regardless of which tab is active
  const isDBInited = useGlobalStore(systemStatusSelectors.isDBInited);
  const isLogin = useUserStore(authSelectors.isLogin);

  // Call the hook directly - this will trigger data fetching immediately
  // when this component mounts, regardless of which tab is active
  useFetchSessions();

  // Also trigger a refresh of sessions when login or DB init state changes
  const refreshSessions = useSessionStore((s) => s.refreshSessions);
  useEffect(() => {
    if (isDBInited && isLogin !== undefined) {
      refreshSessions();
    }
  }, [isDBInited, isLogin, refreshSessions]);

  // two-way bindings the url and session store
  const [session, setSession] = useQueryState(
    'session',
    parseAsString.withDefault('inbox').withOptions({ history: 'replace', throttleMs: 50 }),
  );
  useStoreUpdater('activeId', session);
  useAgentStoreUpdater('activeId', session);
  useChatStoreUpdater('activeId', session);

  useEffect(() => {
    const unsubscribe = useSessionStore.subscribe(
      (s) => s.activeId,
      (state) => {
        switchTopic();
        setSession(state);
      },
    );

    return () => {
      unsubscribe();
    };
  }, [switchTopic, setSession]);

  return null;
});

export default SessionHydration;
