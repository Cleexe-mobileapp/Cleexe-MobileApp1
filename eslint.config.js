// https://docs.expo.dev/guides/using-eslint/
const { defineConfig } = require('eslint/config');
const expoConfig = require('eslint-config-expo/flat');

module.exports = defineConfig([
  expoConfig,
  {
    ignores: ['dist/*'],
  },
  // RNGH requires a side-effect import plus GestureHandlerRootView from the same package.
  {
    files: ['app/_layout.tsx'],
    rules: {
      'import/no-duplicates': 'off',
    },
  },
]);
