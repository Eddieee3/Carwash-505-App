// https://docs.expo.dev/guides/using-eslint/
const { defineConfig } = require("eslint/config");
const expoConfig = require("eslint-config-expo/flat");

module.exports = defineConfig([
  expoConfig,
  {
    // src/shared lo genera scripts/sync-shared.mjs desde la web (allí se revisa con su propio lint).
    ignores: ["dist/*", "src/shared/*"],
  },
]);
