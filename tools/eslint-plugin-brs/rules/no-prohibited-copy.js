/**
 * RULE 4 — no-prohibited-copy
 *
 * Unusual and deliberate. Slop re-enters through copy far more easily than
 * through CSS, and a linter is more reliable than a reviewer's memory.
 *
 * Every phrase below appeared in, or is characteristic of, the discarded
 * prototype: "Bangladesh's premier engineering collective… high-performance
 * robotic systems… global stage" — four unverifiable superlatives in two
 * sentences (implementation_plan.md §2.2 defect 6).
 *
 * The governing test (PROJECT_SPEC.md §5.8): if a sentence works verbatim
 * for another robotics club, it carries no information. Delete it.
 */

const PROHIBITED = [
  // §3.3 prohibited list
  { re: /\bpremier\b/i, why: "unverifiable superlative" },
  { re: /\bcutting[-\s]edge\b/i, why: "unverifiable superlative" },
  { re: /\bworld[-\s]class\b/i, why: "unverifiable superlative" },
  { re: /\bstate[-\s]of[-\s]the[-\s]art\b/i, why: "unverifiable superlative" },
  { re: /\bempowering\b/i, why: "startup register" },
  { re: /\bnext[-\s]generation\b/i, why: "generic aspiration" },
  { re: /\bhigh[-\s]performance\b/i, why: "unverifiable claim" },
  { re: /\bglobal stage\b/i, why: "generic aspiration" },
  { re: /\bshaping the future\b/i, why: "fails the transferability test" },
  { re: /\bcollective\b/i, why: "startup register; BRS is a society" },
  { re: /\bpushing (the )?boundaries\b/i, why: "generic aspiration" },
  { re: /\bwhere .{0,24} meets .{0,24}\b/i, why: "template slogan construction" },
  { re: /\bunlock(ing)? (your|the) potential\b/i, why: "generic aspiration" },
  { re: /\brevolutioni[sz](e|ing)\b/i, why: "unverifiable claim" },
  { re: /\bseamless(ly)?\b/i, why: "SaaS register" },
  { re: /\bleverage\b/i, why: "corporate filler" },
  { re: /\bgame[-\s]chang(er|ing)\b/i, why: "unverifiable claim" },
  { re: /\bget started\b/i, why: "SaaS CTA; the verb is Apply, Read, or View" },
  { re: /\bbook a demo\b/i, why: "SaaS CTA" },
  { re: /\bjoin the waitlist\b/i, why: "SaaS CTA" },
  // §17.4 — inflated institutional claims
  { re: /\bworld[-\s]renowned\b/i, why: "unverifiable superlative" },
  { re: /\bleading (robotics|engineering|university)\b/i, why: "unverifiable superlative" },
  // Placeholder text must never ship (§17.4)
  { re: /\blorem ipsum\b/i, why: "placeholder text" },
];

/** Skip our own documentation of the ban, and test fixtures. */
const SKIP_FILE = /(no-prohibited-copy|\.test\.|__tests__|\.md$)/i;

export default {
  meta: {
    type: "problem",
    docs: {
      description:
        "Forbid AI-slop and unverifiable-superlative copy in user-facing strings",
    },
    schema: [],
    messages: {
      prohibited:
        "Prohibited copy: '{{match}}' ({{why}}). See implementation_plan.md §3.3. The test: if this sentence works verbatim for another robotics club, it carries no information — replace it with a specific, evidenced claim.",
    },
  },

  create(context) {
    const filename = context.filename ?? context.getFilename();
    if (SKIP_FILE.test(filename)) return {};

    function check(node, raw) {
      if (typeof raw !== "string" || raw.trim().length < 3) return;
      for (const { re, why } of PROHIBITED) {
        const hit = raw.match(re);
        if (hit) {
          context.report({
            node,
            messageId: "prohibited",
            data: { match: hit[0], why },
          });
        }
      }
    }

    return {
      Literal(node) {
        if (typeof node.value === "string") check(node, node.value);
      },
      TemplateElement(node) {
        check(node, node.value?.cooked ?? node.value?.raw);
      },
      JSXText(node) {
        check(node, node.value);
      },
    };
  },
};
