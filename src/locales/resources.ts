import { DEFAULT_LANG } from '@/const/locale';

import resources from './default';

export const locales = [
  'en-US',
  'vi-VN',
] as const;

export type DefaultResources = typeof resources;
export type NS = keyof DefaultResources;
export type Locales = (typeof locales)[number];

export const normalizeLocale = (locale?: string): string => {
  if (!locale) return DEFAULT_LANG;

  if (locale.startsWith('vi')) return 'vi-VN';
  if (locale.startsWith('en')) return 'en-US';

  for (const l of locales) {
    if (l.startsWith(locale)) {
      return l;
    }
  }

  return DEFAULT_LANG;
};

type LocaleOptions = {
  label: string;
  value: Locales;
}[];

export const localeOptions: LocaleOptions = [
  {
    label: 'English',
    value: 'en-US',
  },
  {
    label: 'Tiếng Việt',
    value: 'vi-VN',
  },
] as LocaleOptions;

export const supportLocales: string[] = [...locales, 'en'];
