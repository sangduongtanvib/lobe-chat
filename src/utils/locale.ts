import { resolveAcceptLanguage } from 'resolve-accept-language';

import { DEFAULT_LANG } from '@/const/locale';
import { Locales, locales, normalizeLocale } from '@/locales/resources';
import { RouteVariants } from '@/utils/server/routeVariants';

export const getAntdLocale = async (lang?: string) => {
  let normalLang = normalizeLocale(lang);

  // We don't need to handle Arabic anymore since it's not in our locales
  const { default: locale } = await import(`antd/locale/${normalLang.replace('-', '_')}.js`);

  return locale;
};

/**
 * Parse the browser language and return the fallback language
 */
export const parseBrowserLanguage = (headers: Headers, defaultLang: string = DEFAULT_LANG) => {
  // if the default language is not 'en-US', just return the default language as fallback lang
  if (defaultLang !== 'en-US') return defaultLang;

  /**
   * The arguments are as follows:
   *
   * 1) The HTTP accept-language header.
   * 2) The available locales (they must contain the default locale).
   * 3) The default locale.
   */
  let browserLang: string = resolveAcceptLanguage(
    headers.get('accept-language') || '',
    // Just pass the locales directly since we don't need to handle 'ar' anymore
    locales,
    defaultLang,
  );

  // No need to check for ar-EG since it's not in our locales anymore
  return browserLang;
};

/**
 * Parse the page locale from the URL and search params
 * @param props
 */
export const parsePageLocale = async (props: {
  params: Promise<{ variants: string }>;
  searchParams: Promise<any>;
}) => {
  const searchParams = await props.searchParams;

  const browserLocale = await RouteVariants.getLocale(props);
  return normalizeLocale(searchParams?.hl || browserLocale) as Locales;
};
