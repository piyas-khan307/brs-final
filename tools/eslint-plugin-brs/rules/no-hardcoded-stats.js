/**
 * RULE 2 — no-hardcoded-stats
 *
 * The origin of this rule is a real defect. The discarded prototype shipped
 * "480+ ACTIVE MEMBERS / 35+ COMPETITIONS / 10 EXECUTIVE COMMITTEES /
 * 40+ WORKSHOPS". Two were false and two inflated (implementation_plan.md
 * §2.3): 480 is every roster row across seven HISTORICAL committees — the
 * current one is ~52 — and only seven committees are documented, not ten.
 *
 * Generated copy invents plausible numbers. A sponsor who checks one and
 * finds it wrong stops trusting all of them, which is fatal for a site
 * whose whole strategy is "evidence over adjectives".
 *
 * So: no statistic is typed by hand. Numbers come from StatsDTO, computed
 * at build time from content. And no "+" suffixes — precision is the brand.
 */

/** Files whose job is presenting figures. */
const STAT_FILE_PATTERN =
  /(stat|metric|readout|counter|figure|record-strip|recordstrip|kpi)/i;

/** Small numbers that are structural, not statistical. */
const STRUCTURAL_MAX = 12;

export default {
  meta: {
    type: "problem",
    docs: {
      description:
        "Forbid hand-typed statistics; every figure must come from computed StatsDTO",
    },
    schema: [],
    messages: {
      hardcodedNumber:
        "Hand-typed statistic '{{value}}'. Every figure must come from StatsDTO, computed from content at build time (implementation_plan.md §2.3, §7.3). Two of the prototype's four hardcoded numbers were factually false.",
      plusSuffix:
        "Rounded-up statistic '{{value}}'. The '+' suffix is both an AI tell and an admission the real number was never counted (§3.3). Use the exact figure from StatsDTO.",
      approxSuffix:
        "Approximated statistic '{{value}}'. Precision is the brand — use the exact computed figure (§3.3).",
    },
  },

  create(context) {
    const filename = context.filename ?? context.getFilename();
    const isStatFile = STAT_FILE_PATTERN.test(filename);

    /** Flag "480+", "35 +", "~40" in any user-facing string. */
    function checkString(node, value) {
      if (typeof value !== "string") return;
      const plus = value.match(/\b(\d[\d,]*)\s*\+/);
      if (plus) {
        context.report({ node, messageId: "plusSuffix", data: { value: plus[0].trim() } });
        return;
      }
      const approx = value.match(/[~≈]\s*\d[\d,]*/);
      if (approx) {
        context.report({ node, messageId: "approxSuffix", data: { value: approx[0].trim() } });
      }
    }

    return {
      Literal(node) {
        if (typeof node.value === "string") {
          checkString(node, node.value);
          return;
        }

        // Numeric literals are only policed inside stat-presentation files,
        // where a bare number is by definition a statistic.
        if (!isStatFile || typeof node.value !== "number") return;
        if (Number.isInteger(node.value) && Math.abs(node.value) <= STRUCTURAL_MAX) return;

        // Allow numbers in non-presentational positions (array indices,
        // durations in config objects) by ignoring anything not rendered.
        const parent = node.parent;
        if (parent && (parent.type === "MemberExpression" || parent.type === "Property")) return;

        context.report({
          node,
          messageId: "hardcodedNumber",
          data: { value: String(node.value) },
        });
      },

      TemplateElement(node) {
        checkString(node, node.value?.cooked ?? node.value?.raw);
      },

      JSXText(node) {
        checkString(node, node.value);
      },
    };
  },
};
