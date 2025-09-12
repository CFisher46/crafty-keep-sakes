import js from "@eslint/js";
import globals from "globals";
import tseslint from "typescript-eslint";
import prettier from "eslint-config-prettier";
import prettierPlugin from "eslint-plugin-prettier";

export default defineConfig([
  {
    files: ["**/*.{js,mjs,cjs,ts,mts,cts}"],
    plugins: { js, prettier: prettierPlugin },
    extends: ["js/recommended", "plugin:prettier/recommended"],
    rules: {
      "constructor-super": "off", // Disable the problematic rule
      "prettier/prettier": "error" // Ensure Prettier issues are flagged
    }
  },
  {
    files: ["**/*.{js,mjs,cjs,ts,mts,cts}"],
    languageOptions: { globals: globals.browser }
  },
  tseslint.configs.recommended,
  prettier
]);