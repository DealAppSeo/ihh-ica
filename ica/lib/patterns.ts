import type { Case } from "./cases";

// Counts over ICA's own first-pass reviews of the official packets. No model call, nothing learned.
const WAITING = ["not_found", "not_met", "conflicting", "unreadable"]; // cannot_determine left out: mostly blacked-out dates
export const DOC_NAME: Record<string, string> = {
  "DOC-1": "IHH referral form",
  "DOC-2": "Demographics / face sheet",
  "DOC-3": "CalOptima / LOA authorization",
  "DOC-4": "H&P",
  "DOC-5": "Progress notes (if needed)",
  "DOC-6": "Vitals from the last 24 h",
  "DOC-7": "Medication list",
  "DOC-8": "PT/OT or nursing notes",
  "DOC-9": "Blood or wound culture (if needed)",
  "DOC-10": "30-day medication supply",
};

export function patterns(cases: Case[]) {
  // Newest reviewed case per official packet.
  const byPacket = new Map<string, Case>();
  for (const c of cases) {
    if (c.source.kind !== "packet" || c.status !== "reviewed" || !c.review) continue;
    const prev = byPacket.get(c.source.name);
    if (!prev || prev.timings.started < c.timings.started) byPacket.set(c.source.name, c);
  }
  const reviewed = [...byPacket.values()];
  const waiting: Record<string, number> = { hospital: 0, lvn: 0, coordinator: 0, none: 0 };
  const gaps = new Map<string, number>();
  for (const c of reviewed) {
    const open = c.review!.findings.filter((f) => WAITING.includes(f.state));
    for (const f of open) waiting[f.owner] = (waiting[f.owner] ?? 0) + 1;
    const docs = new Set(open.filter((f) => f.rule_id in DOC_NAME && (f.state === "not_found" || f.state === "not_met")).map((f) => f.rule_id));
    for (const d of docs) gaps.set(d, (gaps.get(d) ?? 0) + 1);
  }
  const top = [...gaps].sort((a, b) => b[1] - a[1]).slice(0, 5).map(([id, k]) => ({ id, name: DOC_NAME[id], k }));
  return { n: reviewed.length, waiting, total: Object.values(waiting).reduce((a, b) => a + b, 0), top };
}
