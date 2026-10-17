// Drafts built only from verified findings: no extra AI call, so a draft can't add a claim the review didn't check.
export type DraftFinding = {
  rule_id: string;
  rule_text: string | null;
  state: string;
  summary: string;
  owner: string;
  question: string | null;
  evidence: { quote: string; page: number; direction: string; ground: string }[];
};

const OPEN = ["not_met", "conflicting", "not_found", "unreadable", "clinical_review", "conditional_unconfirmed", "cannot_determine"];
const open = (fs: DraftFinding[], owner: string) => fs.filter((f) => f.owner === owner && OPEN.includes(f.state));
const verified = (f: DraftFinding) => f.evidence.filter((e) => e.ground === "VERIFIED");

export function hospitalDraft(name: string, findings: DraftFinding[]) {
  const doc = (f: DraftFinding) => Number(f.rule_id.startsWith("DOC-"));
  const items = open(findings, "hospital").sort((a, b) => doc(b) - doc(a));
  if (!items.length) return "";
  return [
    `Subject: Recuperative care referral ${name}: ${items.length} item${items.length === 1 ? "" : "s"} needed to complete review`,
    "",
    "Hello,",
    "",
    "Thank you for this referral. To finish our review, please send or confirm the items below. We will respond as soon as we have them.",
    "",
    ...items.map((f, i) => `${i + 1}. ${f.question ?? f.summary} [${f.rule_id}]`),
    "",
    "Thank you,",
    "[Coordinator name], Illumination Health + Home",
    "",
    "DRAFT prepared with ICA. Review and edit before sending; ICA does not send anything.",
  ].join("\n");
}

export function lvnBrief(name: string, findings: DraftFinding[]) {
  const items = open(findings, "lvn");
  if (!items.length) return "";
  const body = items.map((f, i) => {
    const ev = verified(f).map((e) => `   - p.${e.page}${e.direction === "contradicts" ? " (contradicts)" : ""}: "${e.quote}"`).join("\n");
    return `${i + 1}. ${f.rule_id}: ${f.question ?? f.summary}\n   Why: ${f.summary}${ev ? `\n   Evidence:\n${ev}` : "\n   Evidence: none found in the packet."}`;
  });
  return [
    `Clinical review requested · referral ${name}`,
    `${items.length} question${items.length === 1 ? "" : "s"}. Every quote below was checked against its page; open the page to confirm.`,
    "",
    ...body,
    "",
    "No clinical determination has been made. Pending your review.",
  ].join("\n");
}

export function emrNote(name: string, presenting: string, readiness: string, findings: DraftFinding[], decision?: { value: string; detail?: string; role: string; at: string }) {
  const count = (o: string) => open(findings, o).length;
  const met = findings.filter((f) => f.state === "met").map((f) => f.rule_id);
  return [
    `ICA referral review · ${name}`,
    `Presenting problem: ${presenting}`,
    `Status: ${readiness.replaceAll("_", " ")}`,
    `Open items: hospital ${count("hospital")}, LVN ${count("lvn")}, coordinator ${count("coordinator")}`,
    `Met with page-checked evidence: ${met.join(", ") || "none"}`,
    decision ? `Decision: ${decision.value.replace("_", " ")} by ${decision.role} at ${decision.at}${decision.detail ? `. Reason: ${decision.detail}` : ""}` : "Decision: pending (the coordinator decides; ICA does not)",
    "Prepared with ICA for copy into the case record. Not connected to any IHH system.",
  ].join("\n");
}
