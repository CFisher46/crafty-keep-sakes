import { defineConfig } from "eslint";        // ⬅️ this was missing
import js from "@eslint/js";
import globals from "globals";
import tseslint from "typescript-eslint";
import prettier from "eslint-config-prettier";
import prettierPlugin from "eslint-plugin-prettier";

export default defineConfig([
  {
    files: ["**/*.{js,mjs,cjs,ts,mts,cts}"],
    plugins: {
      js,
      prettier: prettierPlugin
    },
    extends: [
      "js/recommended",
      "plugin:prettier/recommended"
    ],
    rules: {
      "constructor-super": "off",
      "prettier/prettier": "error"
    }
  },
  {
    files: ["**/*.{js,mjs,cjs,ts,mts,cts}"],
    languageOptions: {
      globals: globals.browser
    }
  },
  ...tseslint.configs.recommended,   // ⬅️ spread recommended configs
  prettier
]);
