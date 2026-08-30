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
      /* Hand-listed rather than pulled from a `globals` package, because
         the set a build script legitimately reaches for is small and
         worth reading. Timers, FormData and Blob are Node's own since
         18 — the scripts here upload with them, and without them named
         `no-undef` called a stock library global an undefined variable. */
      globals: {
        process: "readonly",
        console: "readonly",
        URL: "readonly",
        fetch: "readonly",
        Buffer: "readonly",
        __dirname: "readonly",
        setTimeout: "readonly",
        clearTimeout: "readonly",
        setInterval: "readonly",
        clearInterval: "readonly",
        FormData: "readonly",
        Blob: "readonly",
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
      // The site builds with output: "export". next/image runs unoptimised
      // under a static export, so it would contribute a wrapper element and
      // nothing else. Every raster on this site is already generated at
      // explicit widths in AVIF/WebP by the scripts/prepare-*.mjs family,
      // with width and height always emitted, which is the entire job this
      // rule exists to nag about.
      "@next/next/no-img-element": "off",
    },
  },

  /* ── Exemptions ────────────────────────────────────────────────────── */
  {
    // The rule implementations and the PII gate necessarily contain the
    // strings and numbers they exist to ban.
    // apps/cms is Directus configuration, not site copy: its numbers are
    // HTTP status codes and slice lengths, and its prose is the admin
    // panel's own field labels. The content rules exist to stop invented
    // figures and prohibited claims reaching VISITORS, and nothing here
    // does.
    files: [
      "tools/eslint-plugin-brs/**",
      "**/scripts/**",
      "apps/cms/**",
      "**/*.test.{mjs,ts}",
    ],
    rules: {
      "brs/no-prohibited-copy": "off",
      "brs/no-hardcoded-stats": "off",
      "brs/no-arbitrary-design-values": "off",
      "brs/no-direct-backend-import": "off",
    },
  },

  /* ── Quoted archive copy ───────────────────────────────────────────────
     brs/no-prohibited-copy exists to stop US writing marketing filler:
     "cutting-edge", "next generation", "shaping the future". Its error
     message says to "replace it with a specific, evidenced claim", which
     is advice that only makes sense to the author of the sentence.

     src/lib/events/*.generated.ts is not our prose. It is the club's own
     announcement copy, extracted verbatim from BRS/ and quoted. Three
     archive entries use exactly these phrases. Rewriting a club's own
     historical words to satisfy our house style would be editing the
     record, and silently at that.

     So the rule is off for extracted archive copy and ON everywhere else,
     including every page component that frames it. The phrases are not
     ignored: extract-events.mjs reports them in content/events.review.md
     so a human can decide to rewrite an entry — which is a content
     decision belonging to the club, not a lint failure belonging to us.

     Narrow on purpose: src/lib/events/, and nothing above it. */
  {
    files: ["apps/web/src/lib/events/*.generated.ts"],
    rules: {
      "brs/no-prohibited-copy": "off",
      "brs/no-hardcoded-stats": "off",
    },
  },

  /* ── The motion sheet ──────────────────────────────────────────────────
     ONE rule is relaxed here, in ONE directory, for a stated reason.

     brs/no-arbitrary-design-values bans Tailwind arbitrary values so that
     design decisions live in globals.css instead of being scattered
     through markup. That reasoning holds for layout. It does not hold for
     the per-plate entry vectors in the assembly section: each plate has
     its own start rotation, translation and scale, they are choreography
     rather than design tokens, and promoting forty one-off values into
     the token file would corrupt the token file to satisfy a lint rule.

     Everything else still applies. In particular no-hardcoded-stats and
     no-prohibited-copy remain ERRORS here — a demo built to impress is
     exactly where an invented "500+ members" would get typed. ── */
  {
    files: ["apps/web/src/components/motion/**", "apps/web/src/components/showcase/**"],
    rules: {
      "brs/no-arbitrary-design-values": "off",
    },
  },
];
