/**
 * ══════════════════════════════════════════════════════════════════════
 * eslint-plugin-brs
 * The five rules from implementation_plan.md §13.4.
 *
 * These exist because each guards a failure this project has already
 * demonstrated it is prone to:
 *   1. no-direct-backend-import   protects the decoupling boundary (§7.4)
 *   2. no-hardcoded-stats         prevents a repeat of §2.3 (the "480+")
 *   3. no-arbitrary-design-values keeps tokens the single source (§10.4)
 *   4. no-prohibited-copy         slop re-enters through copy, not CSS
 *   5. client-component-allowlist protects the 15 KB JS budget (§10.3)
 *
 * Rules 4 and 5 are unusual and deliberate: a linter is more reliable
 * than a reviewer's memory.
 * ══════════════════════════════════════════════════════════════════════
 */

import noDirectBackendImport from "./rules/no-direct-backend-import.js";
import noHardcodedStats from "./rules/no-hardcoded-stats.js";
import noArbitraryDesignValues from "./rules/no-arbitrary-design-values.js";
import noProhibitedCopy from "./rules/no-prohibited-copy.js";
import clientComponentAllowlist from "./rules/client-component-allowlist.js";

const plugin = {
  meta: { name: "eslint-plugin-brs", version: "0.1.0" },
  rules: {
    "no-direct-backend-import": noDirectBackendImport,
    "no-hardcoded-stats": noHardcodedStats,
    "no-arbitrary-design-values": noArbitraryDesignValues,
    "no-prohibited-copy": noProhibitedCopy,
    "client-component-allowlist": clientComponentAllowlist,
  },
};

/** All five as errors. Applied to apps/web and apps/api. */
plugin.configs = {
  recommended: {
    plugins: { brs: plugin },
    rules: {
      "brs/no-direct-backend-import": "error",
      "brs/no-hardcoded-stats": "error",
      "brs/no-arbitrary-design-values": "error",
      "brs/no-prohibited-copy": "error",
      "brs/client-component-allowlist": "error",
    },
  },
};

export default plugin;
