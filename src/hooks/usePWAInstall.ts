import { pwaInstallHandler } from 'pwa-install-handler';
import { useEffect, useRef, useState } from 'react';

import { PWA_INSTALL_ID } from '@/const/layoutTokens';
import { isOnServerSide } from '@/utils/env';

import { usePlatform } from './usePlatform';

export const usePWAInstall = () => {
  const [canInstall, setCanInstall] = useState(false);
  const { isSupportInstallPWA, isPWA } = usePlatform();
  const isMountedRef = useRef(false);

  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  useEffect(() => {
    if (isOnServerSide || !isMountedRef.current) return;

    const safeSetCanInstall = (value: boolean) => {
      if (isMountedRef.current) {
        setCanInstall(value);
      }
    };

    try {
      pwaInstallHandler.addListener(safeSetCanInstall);
    } catch (error) {
      console.warn('PWA install handler error:', error);
    }

    return () => {
      try {
        pwaInstallHandler.removeListener(safeSetCanInstall);
      } catch (error) {
        console.warn('PWA install handler cleanup error:', error);
      }
    };
  }, []);

  const installCheck = () => {
    if (!isMountedRef.current) return false;
    // 当在 PWA 或不支持 PWA 的环境中时，不显示安装按钮
    if (isPWA || !isSupportInstallPWA) return false;

    try {
      const pwa: any = document.querySelector(`#${PWA_INSTALL_ID}`);
      if (!pwa) return false;
      return canInstall;
    } catch (error) {
      console.warn('PWA install check error:', error);
      return false;
    }
  };

  return {
    canInstall: installCheck(),
    install: () => {
      if (!isMountedRef.current) return;

      try {
        const pwa: any = document.querySelector(`#${PWA_INSTALL_ID}`);
        if (!pwa) return;
        pwa.externalPromptEvent = pwaInstallHandler.getEvent();
        pwa?.showDialog(true);
      } catch (error) {
        console.warn('PWA install error:', error);
      }
    },
  };
};
