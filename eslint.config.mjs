import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import prettier from "eslint-config-prettier/flat";

const eslintConfig = defineConfig([
  ...nextVitals,
  prettier,
  {
    files: ["**/*.{js,jsx,mjs,cjs}"],
    rules: {
      "react/jsx-no-target-blank": "off",
      "max-len": [
        "error",
        {
          code: 140,
          ignoreUrls: true,
          ignoreStrings: true,
          ignoreTemplateLiterals: true,
          ignoreRegExpLiterals: true,
        },
      ],
      "capitalized-comments": "off",
      "max-params": ["error", 6],
      "new-cap": "off",
      "no-unused-vars": "warn",
      "no-await-in-loop": "warn",
      "no-else-return": "warn",
      "function-paren-newline": "off",
      "function-call-argument-newline": ["error", "consistent"],
      "multiline-comment-style": "off",
    },
  },
  // Browser tests: Playwright fixtures call `use()`, which isn't a React hook, and test steps
  // (database setup, visiting pages one by one) are meant to run in order.
  {
    files: ["e2e/**"],
    rules: {
      "react-hooks/rules-of-hooks": "off",
      "no-await-in-loop": "off",
    },
  },
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
    "dist/**",
    // Playwright output (generated, minified).
    "playwright-report/**",
    "test-results/**",
  ]),
]);

export default eslintConfig;
