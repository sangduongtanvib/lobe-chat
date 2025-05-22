const { defineConfig } = require('@lobehub/i18n-cli');

module.exports = defineConfig({
  entry: 'resources/locales/en-US',
  entryLocale: 'en-US',
  output: 'resources/locales',
  outputLocales: [
    'ar',
    'bg-BG',
    'zh-TW',
    'en-US',
    'ru-RU',
    'ja-JP',
    'ko-KR',
    'fr-FR',
    'tr-TR',
    'es-ES',
    'pt-BR',
    'de-DE',
    'it-IT',
    'nl-NL',
    'pl-PL',
    'vi-VN',
    'fa-IR',
  ],
  temperature: 0,
  modelName: 'gpt-4o-mini',
  experimental: {
    jsonMode: true,
  },
});
