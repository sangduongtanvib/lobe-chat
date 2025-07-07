const config = require('@lobehub/lint').eslint;

config.extends.push('plugin:@next/next/recommended');

config.rules['unicorn/no-negated-condition'] = 0;
config.rules['unicorn/prefer-type-error'] = 0;
config.rules['unicorn/prefer-logical-operator-over-ternary'] = 0;
config.rules['unicorn/no-null'] = 0;
config.rules['unicorn/no-typeof-undefined'] = 0;
config.rules['unicorn/explicit-length-check'] = 0;
config.rules['unicorn/prefer-code-point'] = 0;
config.rules['no-extra-boolean-cast'] = 0;
config.rules['unicorn/no-useless-undefined'] = 0;
config.rules['react/no-unknown-property'] = 0;
config.rules['unicorn/prefer-ternary'] = 0;
config.rules['unicorn/prefer-spread'] = 0;
config.rules['unicorn/catch-error-name'] = 0;
config.rules['unicorn/no-array-for-each'] = 0;
config.rules['unicorn/prefer-number-properties'] = 0;
config.rules['unicorn/prefer-query-selector'] = 0;
config.rules['unicorn/no-array-callback-reference'] = 0;

config.overrides = [
  {
    extends: ['plugin:mdx/recommended'],
    files: ['*.mdx'],
    rules: {
      '@typescript-eslint/no-unused-vars': 1,
      'no-undef': 0,
      'react/jsx-no-undef': 0,
      'react/no-unescaped-entities': 0,
    },
    settings: {
      'mdx/code-blocks': false,
    },
  },
  {
    env: {
      serviceworker: true,
    },
    files: ['public/sw.js'],
    globals: {
      FetchEvent: 'readonly',
      registration: 'readonly',
      self: 'readonly',
    },
    rules: {
      'no-empty': 'off',
      'no-param-reassign': 'off',
      'no-promise-executor-return': 'off',
      'no-undef': 'off',
      'unicorn/consistent-function-scoping': 'off',
      'unicorn/no-await-expression-member': 'off',
      'unicorn/no-negation-in-equality-check': 'off',
      'unicorn/no-this-assignment': 'off',
      'unicorn/no-unreadable-iife': 'off',
      'unused-imports/no-unused-vars': 'off',
    },
  },
];

module.exports = config;
