import fs from "node:fs";
import { getCase } from "@/lib/cases";
import { verifyChain } from "@/lib/events";
import { CRITERIA_FILE } from "@/lib/paths";

let ruleText: Map<string, string> | null = null;
function texts() {
  if (ruleText) return ruleText;
  const j = JSON.parse(fs.readFileSync(CRITERIA_FILE, "utf8"));
  const all = [
    ...j.general.any_of,
    ...j.rules,
    ...j.referral_checklist.items,
    ...j.referral_form_screen.must_meet_all,
    ...j.referral_form_screen.not_eligible_if,
    ...j.by_system.flatMap((s: { eligible?: unknown[]; ineligible?: unknown[] }) => [...(s.eligible ?? []), ...(s.ineligible ?? [])]),
  ] as { id: string; text: string }[];
  ruleText = new Map(all.map((r) => [r.id, r.text]));
  return ruleText;
}

export async function GET(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  const c = getCase(id) as (ReturnType<typeof getCase> & { events?: Parameters<typeof verifyChain>[0] }) | null;
  if (!c) return Response.json({ error: "Not found" }, { status: 404 });
  // Attach IHH's own wording for each rule, so drafts quote the requirement exactly.
  const t = texts();
  const review = c.review && { ...c.review, findings: c.review.findings.map((f) => ({ ...f, rule_text: t.get(f.rule_id) ?? null })) };
  return Response.json({ ...c, review, chain_ok: verifyChain(c.events) });
}
