const { defineConfig } = require("eslint/config");
const expoConfig = require("eslint-config-expo/flat");

module.exports = defineConfig([
  expoConfig,
  // src/shared is generated from egx-api-fe, which lints it there.
  { ignores: ["dist/*", "src/shared/*"] },
]);
