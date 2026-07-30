import js from "@eslint/js";
import tseslint from "typescript-eslint";
import nextPlugin from "@next/eslint-plugin-next";
import brs from "eslint-plugin-brs";

/**
 * Flat config. The five BRS rules (implementation_plan.md §13.4) are errors,
 * not warnings — each guards a failure this project has already demonstrated
 * it is prone to.
 */
export default [
  {
    ignores: [
      "**/node_modules/**",
      "**/.next/**",
      "**/out/**",
      "**/dist/**",
      "**/.turbo/**",
      "**/openapi.json",
      "BRS/**",
      "BRS ExCom/**",
      "logo/**",
    ],
  },

  js.configs.recommended,

  /* ── TypeScript / TSX ──────────────────────────────────────────────── */
  {
    files: ["**/*.{ts,tsx,mts}"],
    languageOptions: {
      parser: tseslint.parser,
      ecmaVersion: 2022,
      sourceType: "module",
      parserOptions: { ecmaFeatures: { jsx: true } },
    },
    plugins: { "@typescript-eslint": tseslint.plugin },
    rules: {
      // The base rules cannot see TS types and misfire on type-only usage.
      "no-unused-vars": "off",
      "no-undef": "off", // TS handles this
      // `export const X = z.object(...)` plus `export type X = z.infer<typeof X>`
      // is the idiomatic Zod pattern: a value and a type sharing one name in
      // two different declaration spaces. It is legal TypeScript, and tsc is
      // the authority on genuine redeclaration — so both lint rules are
      // redundant here and only produce false positives.
      "no-redeclare": "off",
      "@typescript-eslint/no-redeclare": "off",
      "@typescript-eslint/no-unused-vars": [
        "error",
        {
          argsIgnorePattern: "^_",
          varsIgnorePattern: "^_",
          // `const { width, ...rest } = obj` is how you omit a key. The
          // omitted binding is intentionally unused.
          ignoreRestSiblings: true,
        },
      ],
    },
  },

  /* ── Plain JS / MJS ────────────────────────────────────────────────── */
  {
    files: ["**/*.{js,mjs,cjs}"],
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: "module",
      globals: {
        process: "readonly",
        console: "readonly",
        URL: "readonly",
        fetch: "readonly",
        Buffer: "readonly",
        __dirname: "readonly",
      },
    },
    rules: {
      "no-unused-vars": ["error", { argsIgnorePattern: "^_", varsIgnorePattern: "^_" }],
    },
  },

  /* ── The BRS rules — applied everywhere ────────────────────────────── */
  {
    files: ["**/*.{js,mjs,ts,tsx}"],
    plugins: { brs },
    rules: {
      "brs/no-direct-backend-import": "error",
      "brs/no-hardcoded-stats": "error",
      "brs/no-arbitrary-design-values": "error",
      "brs/no-prohibited-copy": "error",
      "brs/client-component-allowlist": "error",
    },
  },

  /* ── Next.js ───────────────────────────────────────────────────────── */
  {
    files: ["apps/web/**/*.{ts,tsx}"],
    plugins: { "@next/next": nextPlugin },
    rules: {
      ...nextPlugin.configs.recommended.rules,
      ...nextPlugin.configs["core-web-vitals"].rules,
      // App Router only — there is no pages/ directory by design.
      "@next/next/no-html-link-for-pages": "off",
    },
  },

  /* ── Exemptions ────────────────────────────────────────────────────── */
  {
    // The rule implementations and the PII gate necessarily contain the
    // strings and numbers they exist to ban.
    files: ["tools/eslint-plugin-brs/**", "**/scripts/**", "**/*.test.{mjs,ts}"],
    rules: {
      "brs/no-prohibited-copy": "off",
      "brs/no-hardcoded-stats": "off",
      "brs/no-arbitrary-design-values": "off",
      "brs/no-direct-backend-import": "off",
    },
  },
];
