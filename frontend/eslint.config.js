import eslint from "@eslint/js";
import tseslint from "@typescript-eslint/eslint-plugin";
import tsParser from "@typescript-eslint/parser";
import prettier from "eslint-plugin-prettier";
import prettierConfig from "eslint-config-prettier";
import jasmine from "eslint-plugin-jasmine";

export default [
  eslint.configs.recommended,
  {
    files: ["src/**/*.ts"],
    languageOptions: {
      parser: tsParser,
      globals: {
        window: "readonly",
        document: "readonly",
        console: "readonly",
        fetch: "readonly",
        confirm: "readonly",
      },
    },
    plugins: {
      "@typescript-eslint": tseslint,
      prettier,
      jasmine,
    },
    rules: {
      ...tseslint.configs.recommended.rules,
      ...prettier.configs.recommended.rules,
      "no-console": "warn",
      quotes: ["error", "single"],
      semi: ["error", "always"],
      "comma-dangle": ["error", "always-multiline"],
      "@typescript-eslint/no-unused-vars": "warn",
    },
  },
  {
    files: ["src/**/*.spec.ts"],
    plugins: {
      jasmine,
    },
    languageOptions: {
      globals: {
        describe: "readonly",
        it: "readonly",
        expect: "readonly",
        beforeEach: "readonly",
        afterEach: "readonly",
      },
    },
    rules: {
      "no-undef": "off",
    },
  },
  prettierConfig,
];
