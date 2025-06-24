import { PropsWithChildren } from 'react';
import { Center, Flexbox } from 'react-layout-kit';

// Import the component directly
import AuthStoreInitialization from '@/app/(auth)/AuthStoreInitialization';
import { enableNextAuth } from '@/const/auth';
import AuthProvider from '@/layout/AuthProvider';
import Locale from '@/layout/GlobalProvider/Locale';
import QueryProvider from '@/layout/GlobalProvider/Query';
import StyleRegistry from '@/layout/GlobalProvider/StyleRegistry';
import { getServerGlobalConfig } from '@/server/globalConfig';
import { ServerConfigStoreProvider } from '@/store/serverConfig/Provider';
import { getAntdLocale } from '@/utils/locale';

const AuthLayout = async ({ children }: PropsWithChildren) => {
  // Use default locale for auth pages
  const defaultLocale = 'en-US';
  const antdLocale = await getAntdLocale(defaultLocale);
  const serverConfig = await getServerGlobalConfig();

  return (
    <StyleRegistry>
      <Locale antdLocale={antdLocale} defaultLang={defaultLocale}>
        <ServerConfigStoreProvider isMobile={false} serverConfig={serverConfig}>
          <QueryProvider>
            {enableNextAuth && <AuthProvider />}
            <Flexbox height={'100%'} width={'100%'}>
              <Center height={'100%'} width={'100%'}>
                {children}
              </Center>
            </Flexbox>
            <AuthStoreInitialization />
          </QueryProvider>
        </ServerConfigStoreProvider>
      </Locale>
    </StyleRegistry>
  );
};

export default AuthLayout;
