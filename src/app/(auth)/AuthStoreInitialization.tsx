'use client';

import { memo } from 'react';
import { createStoreUpdater } from 'zustand-utils';

import { useServerConfigStore } from '@/store/serverConfig';
import { serverConfigSelectors } from '@/store/serverConfig/selectors';
import { useUserStore } from '@/store/user';

const AuthStoreInitialization = memo(() => {
  // Update NextAuth status
  const useUserStoreUpdater = createStoreUpdater(useUserStore);
  const oAuthSSOProviders = useServerConfigStore(serverConfigSelectors.oAuthSSOProviders);
  useUserStoreUpdater('oAuthSSOProviders', oAuthSSOProviders);

  // fetch server config
  const useFetchServerConfig = useServerConfigStore((s) => s.useInitServerConfig);
  useFetchServerConfig();

  return null;
});

export default AuthStoreInitialization;
