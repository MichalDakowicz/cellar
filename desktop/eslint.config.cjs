const parser = require("@typescript-eslint/parser");
const typescript = require("@typescript-eslint/eslint-plugin");
const react = require("eslint-plugin-react");
const hooks = require("eslint-plugin-react-hooks");

module.exports = [
  {
    ignores: ["build/**", "release/**", "renderer-dist/**", "node_modules/**"],
  },
  {
    files: ["src/**/*.ts", "src/**/*.tsx", "*.mts"],
    languageOptions: {
      parser,
      parserOptions: {
        ecmaVersion: "latest",
        sourceType: "module",
        ecmaFeatures: { jsx: true },
      },
    },
    plugins: { "@typescript-eslint": typescript, react, "react-hooks": hooks },
    settings: { react: { version: "19.2" } },
    rules: {
      "no-control-regex": "error",
      "@typescript-eslint/no-unused-vars": [
        "error",
        { argsIgnorePattern: "^_", varsIgnorePattern: "^_", ignoreRestSiblings: true },
      ],
      "react/jsx-key": "error",
      "react/no-unescaped-entities": "error",
      "react/jsx-no-target-blank": "error",
      "react-hooks/rules-of-hooks": "error",
      "react-hooks/exhaustive-deps": "warn",
    },
  },
];
