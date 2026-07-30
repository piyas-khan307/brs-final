/**
 * RULE 3 — no-arbitrary-design-values
 *
 * globals.css @theme is the single source of design truth (§10.4). An
 * arbitrary Tailwind value is a design decision made in a component file,
 * invisible to the system and impossible to maintain across the annual
 * ExCom handover.
 *
 * Also bans the utilities that would reintroduce the discarded prototype's
 * aesthetic: shadow-* (glow is the opposite of precision — §5.1 rule 2),
 * backdrop-blur (glassmorphism), and gradient utilities (§3.3).
 */

const CLASS_ATTRS = new Set(["className", "class"]);

/** Tailwind arbitrary value: bg-[#22d3ee], text-[13px], w-[347px] */
const ARBITRARY = /(^|[\s:])[a-z][a-z0-9-]*-\[[^\]]+\]/gi;

/** Arbitrary values that are legitimate: grid templates, aspect ratios,
 *  and CSS-variable references (which point BACK at tokens). */
const ARBITRARY_ALLOWED =
  /-\[(var\(--|calc\(var\(--|\d+\/\d+\]|(repeat|minmax|fit-content)\()/i;

const BANNED_UTILITIES = [
  {
    re: /(^|\s)shadow-(?!none)[a-z0-9-]+/,
    id: "bannedShadow",
    hint: "shadow-*",
  },
  {
    re: /(^|\s)(drop-shadow|backdrop-blur|backdrop-filter)-?[a-z0-9-]*/,
    id: "bannedEffect",
    hint: "drop-shadow / backdrop-blur",
  },
  {
    re: /(^|\s)bg-gradient-to-[a-z]+|(^|\s)bg-linear-|(^|\s)from-[a-z]|(^|\s)via-[a-z]|(^|\s)to-[a-z]/,
    id: "bannedGradient",
    hint: "gradient utilities",
  },
  {
    re: /(^|\s)rounded-(?!none)(sm|md|lg|xl|2xl|3xl|full)/,
    id: "bannedRadius",
    hint: "rounded-{sm..full}",
  },
];

export default {
  meta: {
    type: "problem",
    docs: {
      description:
        "Forbid arbitrary Tailwind values and utilities banned by the design system",
    },
    schema: [],
    messages: {
      arbitrary:
        "Arbitrary design value '{{value}}'. All values come from globals.css @theme (implementation_plan.md §10.4). Add a token instead of inlining a decision.",
      bannedShadow:
        "'{{value}}' is banned on this project. Elevation is expressed by surface value plus a hairline — no box-shadow (PROJECT_SPEC.md §5.1 rule 4, §3.2). Accent-hue glow is the single clearest marker of the aesthetic we are avoiding.",
      bannedEffect:
        "'{{value}}' is banned: glassmorphism and blur effects (§3.3, §17.1).",
      bannedGradient:
        "'{{value}}' is banned: no gradients except a <=12% legibility scrim, which is hand-written CSS (§3.3, rubric check 8).",
      bannedRadius:
        "'{{value}}' is banned. This system is square by intent: radius-none for plates and structural surfaces, radius-input (2px) for inputs only (§17.5).",
    },
  },

  create(context) {
    function check(node, raw) {
      if (typeof raw !== "string" || raw.length === 0) return;

      ARBITRARY.lastIndex = 0;
      let m;
      while ((m = ARBITRARY.exec(raw)) !== null) {
        const token = m[0].trim();
        if (ARBITRARY_ALLOWED.test(token)) continue;
        context.report({ node, messageId: "arbitrary", data: { value: token } });
      }

      for (const { re, id, hint } of BANNED_UTILITIES) {
        const hit = raw.match(re);
        if (hit) {
          context.report({
            node,
            messageId: id,
            data: { value: (hit[0] || hint).trim() },
          });
        }
      }
    }

    return {
      JSXAttribute(node) {
        if (!node.name || !CLASS_ATTRS.has(node.name.name)) return;
        const v = node.value;
        if (!v) return;

        if (v.type === "Literal") {
          check(node, v.value);
        } else if (v.type === "JSXExpressionContainer") {
          const expr = v.expression;
          if (expr.type === "Literal") check(node, expr.value);
          if (expr.type === "TemplateLiteral") {
            for (const q of expr.quasis) check(node, q.value.cooked ?? q.value.raw);
          }
          // clsx('a', cond && 'b') — inspect string arguments
          if (expr.type === "CallExpression") {
            for (const a of expr.arguments) {
              if (a.type === "Literal") check(node, a.value);
              if (a.type === "LogicalExpression" && a.right.type === "Literal") {
                check(node, a.right.value);
              }
            }
          }
        }
      },
    };
  },
};
