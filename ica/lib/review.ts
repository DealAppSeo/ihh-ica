import fs from "node:fs";
import { z } from "zod";
import { zodOutputFormat } from "@anthropic-ai/sdk/helpers/zod";
import { claude, MODEL, cost } from "./claude";
import { CRITERIA_FILE } from "./paths";
import { groundQuote, type GroundStatus } from "./ground";
import type { Page, Usage } from "./transcribe";

export const STATES = [
  "met", // the chart shows this requirement is met
  "not_met", // the chart shows an exclusion applies or a requirement is not met
  "not_found", // looked, not in the packet
  "unreadable", // may be there, but the scan or handwriting can't be read reliably
  "conflicting", // two pages disagree
  "redacted", // the needed field was blacked out for privacy
  "cannot_determine", // needs a date or a count of hours, and dates are blacked out
  "clinical_review", // the rule needs a clinical judgment
  "conditional_unconfirmed", // allowed only if an arrangement is confirmed, and it isn't yet
] as const;
export type State = (typeof STATES)[number];
const OWNERS = ["hospital", "lvn", "coordinator", "none"] as const;

const Evidence = z.object({
  quote: z.string(),
  page: z.number().int(),
  direction: z.enum(["supports", "contradicts"]),
});
const ReviewSchema = z.object({
  presenting_problem: z.string(),
  referral_form_present: z.boolean(),
  under_18: z.boolean(), // IHH's children's criteria apply; this prototype checks the adult rules only
  triggered: z.array(z.object({ section: z.string(), why: z.string(), evidence: z.array(Evidence) })),
  findings: z.array(
    z.object({
      rule_id: z.string(),
      state: z.enum(STATES),
      summary: z.string(),
      evidence: z.array(Evidence),
      owner: z.enum(OWNERS),
      question: z.string().nullable(),
    }),
  ),
});

export type Evidence = z.infer<typeof Evidence> & { ground: GroundStatus; reason: string };
export type Finding = Omit<z.infer<typeof ReviewSchema>["findings"][number], "evidence"> & {
  evidence: Evidence[];
  note?: string;
  exclusion?: boolean; // true when IHH's file lists this rule as an exclusion
};
export type Review = {
  presenting_problem: string;
  referral_form_present: boolean;
  under_18: boolean;
  triggered: { section: string; why: string }[];
  findings: Finding[];
  vetoes: number;
  readiness: "exclusion_to_review" | "needs_attention" | "ready_for_decision";
  usage: Usage;
};

const criteria = () => fs.readFileSync(CRITERIA_FILE, "utf8");

// Which rule IDs are exclusions, from IHH's own file (not the model's say-so).
function exclusionIds(): Set<string> {
  const j = JSON.parse(criteria());
  const ids = new Set<string>();
  for (const r of j.rules) if (r.kind === "exclude") ids.add(r.id);
  for (const s of j.by_system) for (const r of s.ineligible ?? []) ids.add(r.id);
  for (const r of j.referral_form_screen?.not_eligible_if ?? []) ids.add(r.id);
  return ids;
}

const INSTRUCTIONS = `You help an Illumination Health + Home (IHH) referral coordinator review a hospital referral packet against IHH's admission criteria (JSON above). You never decide eligibility. A confident wrong answer is the worst outcome; "unknown" is always allowed.

Two stages:
A. Universal, always: GEN-1..3 (any one), every rule in ADLs, Mobility, Mental Health, Cognition, Other Factors and Infection Control, and checklist items DOC-1..DOC-10.
B. Condition-triggered: rules in End of life care, Diabetes, Infection, Respiratory Illness, Cardiac, and the by_system lists, ONLY for conditions the chart actually documents. List each triggered section with why. Do not report rules for conditions the chart does not mention.

For each rule you report, choose exactly one state:
- met / not_met: the chart clearly shows it. For an exclude rule, not_met means the exclusion applies.
- not_found: not in the packet after reading every page. Not in the packet means unknown, never normal.
- unreadable: it may be there but the page is [illegible] or marked uncertain [?].
- conflicting: pages disagree. Give evidence for both sides (supports and contradicts).
- redacted: the needed field is [REDACTED]. A black box is removed for privacy, not a missing document.
- cannot_determine: the rule needs a date or a count of hours (e.g. within 24 hours) and dates are blacked out.
- clinical_review: the rule needs clinical judgment (e.g. medically stable, psychiatric stability, case by case).
- conditional_unconfirmed: allowed only if an arrangement is confirmed before admission, and the packet doesn't confirm it.

Precedence (from the JSON): when the referral form screen (FORM-*) and the outline disagree, the outline wins. MOB-3 and MOB-4 (wheelchair users who transfer independently are eligible) override FORM-M6 and FORM-X3. OTH-2 (case by case) overrides FORM-X6. Where the outline is silent (tuberculosis, refusing detox), the form's exclusion applies. Check the chart, not only the form: the form is one person's summary.

Evidence: every quote must be copied character for character from ONE page of the packet below, short (under 25 words), with that page's number. Never invent a quote or a page. If you cannot quote it, say not_found or unreadable.

Owner and question, for anything not met: hospital (a document or fact the hospital must send or confirm), lvn (conflicts and clinical judgment), coordinator (program fit, case-by-case, IHH-side arrangements), none (met, or nothing anyone can do, e.g. redacted). Write one specific, polite question for the owner. Group nothing; one finding per rule.

presenting_problem: one plain sentence from the chart. referral_form_present: whether IHH's referral form is in the packet. under_18: true only if the chart shows the patient is under 18 (children's program criteria would apply instead).`;

export async function review(pages: Page[]): Promise<Review> {
  const packet = pages
    .map((p) => `=== PAGE ${p.n} (${p.type}${p.legibility !== "good" ? `, legibility ${p.legibility}` : ""}) ===\n${p.text}`)
    .join("\n\n");

  const msg = await claude()
    .messages.stream({
      model: MODEL,
      max_tokens: 24000,
      output_config: { effort: "medium", format: zodOutputFormat(ReviewSchema) },
      inference_geo: "us",
      system: [
        { type: "text", text: `IHH admission criteria (JSON):\n${criteria()}\n\n${INSTRUCTIONS}`, cache_control: { type: "ephemeral" } },
      ],
      messages: [{ role: "user", content: `Referral packet, ${pages.length} pages:\n\n${packet}` }],
    })
    .finalMessage();

  const usage: Usage = { input_tokens: msg.usage.input_tokens + (msg.usage.cache_read_input_tokens ?? 0) + (msg.usage.cache_creation_input_tokens ?? 0), output_tokens: msg.usage.output_tokens, cost: 0 };
  usage.cost = cost({ input_tokens: msg.usage.input_tokens + (msg.usage.cache_creation_input_tokens ?? 0) * 1.25 + (msg.usage.cache_read_input_tokens ?? 0) * 0.1, output_tokens: msg.usage.output_tokens });
  if (msg.stop_reason !== "end_turn") throw new Error(`Review stopped early (${msg.stop_reason}). Nothing is shown rather than a partial review.`);
  const text = msg.content.map((b) => (b.type === "text" ? b.text : "")).join("");
  const r = ReviewSchema.parse(JSON.parse(text));

  // TrustShell grounding: every quote must be on the page it cites. A VETO is kept for audit but never counts.
  const groundPages = pages.map((p) => ({ n: p.n, text: p.text }));
  let vetoes = 0;
  const findings: Finding[] = r.findings.map((f) => {
    const evidence: Evidence[] = f.evidence.map((e) => {
      const g = groundQuote({ quote: e.quote, page: e.page }, groundPages);
      if (g.status === "VETO") vetoes++;
      return { ...e, ground: g.status, reason: g.reason };
    });
    const ok = evidence.filter((e) => e.ground === "VERIFIED");
    const finding: Finding = { ...f, evidence };
    const needsProof = ["met", "not_met", "conflicting"].includes(f.state);
    if (needsProof && ok.length === 0) {
      finding.state = "not_found";
      finding.owner = finding.owner === "none" ? "coordinator" : finding.owner;
      finding.question ??= "Check the original pages: ICA could not verify a quote for this rule.";
      finding.note = "Downgraded: no quote could be verified against its page.";
    } else if (f.state === "conflicting") {
      const sides = new Set(ok.map((e) => e.direction));
      if (sides.size < 2) {
        finding.state = "clinical_review";
        finding.owner = "lvn";
        finding.note = "Only one side of the conflict could be verified; kept for clinical review.";
      }
    }
    return finding;
  });

  const excl = exclusionIds();
  for (const f of findings) f.exclusion = excl.has(f.rule_id);
  const open = findings.filter((f) => !["met", "redacted"].includes(f.state) && f.owner !== "none");
  const exclusion = findings.some((f) => f.exclusion && f.state === "not_met" && f.evidence.some((e) => e.ground === "VERIFIED"));
  return {
    presenting_problem: r.presenting_problem,
    referral_form_present: r.referral_form_present,
    under_18: r.under_18,
    triggered: r.triggered.map(({ section, why }) => ({ section, why })),
    findings,
    vetoes,
    readiness: exclusion ? "exclusion_to_review" : open.length ? "needs_attention" : "ready_for_decision",
    usage,
  };
}
