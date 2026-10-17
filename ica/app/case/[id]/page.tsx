"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";

type Page = { n: number; text: string; type: string; legibility: string; orientation: string; status: string };
type Evidence = { quote: string; page: number; direction: string; ground: string; reason: string };
type Finding = { rule_id: string; state: string; summary: string; evidence: Evidence[]; owner: string; question: string | null; note?: string; exclusion?: boolean };
type Review = {
  presenting_problem: string;
  referral_form_present: boolean;
  triggered: { section: string; why: string }[];
  findings: Finding[];
  vetoes: number;
  readiness: string;
  usage: { cost: number };
};
type Case = {
  id: string;
  source: { name: string };
  status: string;
  progress: { done: number; total: number };
  pages: Page[];
  usage?: { cost: number };
  review?: Review;
  timings: { transcribe_s?: number; review_s?: number; seconds?: number };
  error?: string;
};

const LABEL: Record<string, string> = {
  met: "Met",
  not_met: "Exclusion / not met",
  not_found: "Not in packet",
  unreadable: "Unreadable: check page",
  conflicting: "Pages disagree",
  redacted: "Removed for privacy",
  cannot_determine: "Can't tell: dates removed",
  clinical_review: "Needs clinical judgment",
  conditional_unconfirmed: "Arrangement not confirmed",
};
const TONE: Record<string, string> = {
  met: "bg-green-100 text-green-900",
  not_met: "bg-red-100 text-red-900",
  conflicting: "bg-red-100 text-red-900",
  redacted: "bg-gray-200 text-gray-800",
};
const ATTENTION_ORDER = ["not_met", "conflicting", "not_found", "unreadable", "clinical_review", "conditional_unconfirmed", "cannot_determine"];
const OWNER: Record<string, string> = { hospital: "Hospital", lvn: "LVN", coordinator: "Coordinator" };
const READY: Record<string, [string, string]> = {
  exclusion_to_review: ["An exclusion needs review before any decision", "bg-red-100 text-red-900"],
  needs_attention: ["Needs answers before a decision", "bg-amber-100 text-amber-900"],
  ready_for_decision: ["Ready for your decision", "bg-green-100 text-green-900"],
};

// Show uncertainty instead of hiding it.
function Marked({ text }: { text: string }) {
  const parts = text.split(/(\[REDACTED\]|\[illegible\]|\S+\[\?\])/g);
  return (
    <>
      {parts.map((p, i) =>
        p === "[REDACTED]" ? <mark key={i} className="bg-gray-800 px-1 text-white">removed for privacy</mark>
        : p === "[illegible]" ? <mark key={i} className="bg-amber-200 px-1">unreadable</mark>
        : p.endsWith("[?]") ? <mark key={i} className="bg-amber-100 px-1" title="Uncertain: check the original page">{p.slice(0, -3)}?</mark>
        : p,
      )}
    </>
  );
}

function Chip({ state }: { state: string }) {
  return <span className={`rounded px-2 py-0.5 text-xs font-medium ${TONE[state] ?? "bg-amber-100 text-amber-900"}`}>{LABEL[state] ?? state}</span>;
}

function EvidenceLine({ e, caseId }: { e: Evidence; caseId: string }) {
  const verified = e.ground === "VERIFIED";
  return (
    <li className={`text-sm ${verified ? "" : "opacity-60"}`}>
      <span className="italic">“{e.quote}”</span>{" "}
      <a className="text-blue-800 underline" href={`/api/pdf/${caseId}#page=${e.page}`} target="_blank">p.{e.page}</a>{" "}
      <span className={`text-xs ${verified ? "text-green-800" : "text-red-800"}`} title={e.reason}>
        {verified ? "✓ quote found on this page" : e.ground === "VETO" ? "✗ not on this page: ignored" : "couldn't check"}
      </span>
      {e.direction === "contradicts" && <span className="ml-1 text-xs text-red-800">(contradicts)</span>}
    </li>
  );
}

function FindingCard({ f, caseId }: { f: Finding; caseId: string }) {
  return (
    <li className="rounded border p-3 space-y-1">
      <div className="flex flex-wrap items-center gap-2">
        <span className="font-mono text-xs">{f.rule_id}</span>
        {f.state === "not_met" ? (
          <span className="rounded bg-red-100 px-2 py-0.5 text-xs font-medium text-red-900">{f.exclusion ? "Exclusion applies" : "Requirement not met"}</span>
        ) : (
          <Chip state={f.state} />
        )}
        {f.owner !== "none" && f.state !== "met" && <span className="text-xs text-gray-600">→ {OWNER[f.owner]}</span>}
      </div>
      <p className="text-sm">{f.summary}</p>
      {f.evidence.length > 0 && <ul className="space-y-1">{f.evidence.map((e, i) => <EvidenceLine key={i} e={e} caseId={caseId} />)}</ul>}
      {f.question && f.state !== "met" && <p className="text-sm text-gray-700">Ask: {f.question}</p>}
      {f.note && <p className="text-xs text-red-800">{f.note}</p>}
    </li>
  );
}

export default function CasePage() {
  const { id } = useParams<{ id: string }>();
  const [c, setC] = useState<Case | null>(null);

  async function load() {
    const r = await fetch(`/api/cases/${id}`);
    if (r.ok) setC(await r.json());
  }
  useEffect(() => {
    load();
    const t = setInterval(load, 2500);
    return () => clearInterval(t);
  }, [id]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!c) return <main className="p-6">Loading…</main>;
  const r = c.review;
  const attention = (r?.findings ?? [])
    .filter((f) => ATTENTION_ORDER.includes(f.state))
    .sort((a, b) => ATTENTION_ORDER.indexOf(a.state) - ATTENTION_ORDER.indexOf(b.state));
  const known = (r?.findings ?? []).filter((f) => f.state === "met");
  const privacy = (r?.findings ?? []).filter((f) => f.state === "redacted");
  const byOwner = ["hospital", "lvn", "coordinator"].map((o) => [o, attention.filter((f) => f.owner === o)] as const).filter(([, l]) => l.length);
  const cost = (c.usage?.cost ?? 0) + (r?.usage.cost ?? 0);

  return (
    <main className="mx-auto max-w-5xl p-6 space-y-4">
      <Link href="/" className="text-sm text-blue-800 underline">← Docket</Link>
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h1 className="text-2xl font-bold">Referral {c.source.name}</h1>
        {r && <span className={`rounded px-3 py-1 text-sm font-semibold ${READY[r.readiness][1]}`}>{READY[r.readiness][0]}</span>}
      </div>
      <p className="text-sm text-gray-700">
        {c.status === "transcribing" && `Reading page ${c.progress.done} of ${c.progress.total || "…"}…`}
        {c.status === "reviewing" && "Checking against IHH's criteria…"}
        {c.pages.length > 0 && ` ${c.pages.length} pages`}
        {c.timings.transcribe_s != null && ` · read in ${c.timings.transcribe_s}s`}
        {c.timings.review_s != null && ` · reviewed in ${c.timings.review_s}s`}
        {cost > 0 && ` · $${cost.toFixed(2)}`}
        {r && ` · ${r.vetoes} quote${r.vetoes === 1 ? "" : "s"} rejected by the page check`}
      </p>
      {c.error && <p className="rounded bg-red-50 p-2 text-red-800">Error: {c.error}</p>}
      {c.pages.length > 0 && !["transcribing", "reviewing"].includes(c.status) && (
        <button className="rounded border px-3 py-1 text-sm" onClick={async () => { await fetch(`/api/cases/${id}/review`, { method: "POST" }); load(); }}>Re-run review</button>
      )}

      {r && (
        <>
          <p className="text-sm"><span className="font-semibold">Presenting problem:</span> {r.presenting_problem}{!r.referral_form_present && " · No IHH referral form in this packet."}</p>
          <div className="grid gap-4 md:grid-cols-2">
            <section className="rounded-lg border p-4 space-y-2">
              <h2 className="font-semibold">What we know</h2>
              <p className="text-xs text-gray-600">Met, with a quote checked against its page. Open the page to confirm.</p>
              <ul className="space-y-2">{known.map((f) => <FindingCard key={f.rule_id} f={f} caseId={c.id} />)}</ul>
              {r.triggered.length > 0 && <p className="text-xs text-gray-700">Condition rules checked: {r.triggered.map((t) => t.section).join(", ")}.</p>}
              {privacy.length > 0 && <p className="text-xs text-gray-600">Removed for privacy (not missing): {privacy.map((f) => f.rule_id).join(", ")}.</p>}
            </section>
            <section className="rounded-lg border-2 border-amber-300 p-4 space-y-2">
              <h2 className="font-semibold">What needs attention ({attention.length})</h2>
              <ul className="space-y-2">{attention.map((f) => <FindingCard key={f.rule_id} f={f} caseId={c.id} />)}</ul>
              {attention.length === 0 && <p className="text-sm">Nothing open.</p>}
            </section>
            <section className="rounded-lg border p-4 space-y-2">
              <h2 className="font-semibold">Who needs to respond</h2>
              {byOwner.map(([o, list]) => (
                <div key={o}>
                  <h3 className="text-sm font-semibold">{OWNER[o]} · {list.length}</h3>
                  <ul className="list-disc pl-5 text-sm">{list.map((f) => <li key={f.rule_id}>{f.question ?? f.summary} <span className="font-mono text-xs">({f.rule_id})</span></li>)}</ul>
                </div>
              ))}
              {byOwner.length === 0 && <p className="text-sm">No one: nothing is waiting.</p>}
            </section>
            <section className="rounded-lg border p-4 space-y-2">
              <h2 className="font-semibold">Next step</h2>
              <ol className="list-decimal pl-5 text-sm space-y-1">
                {r.readiness === "exclusion_to_review" && <li>Review the exclusion with the LVN before anything else.</li>}
                {byOwner.map(([o, list]) => <li key={o}>{o === "hospital" ? `Send one clarification to the hospital covering ${list.length} item${list.length === 1 ? "" : "s"}.` : o === "lvn" ? `Ask the LVN ${list.length} question${list.length === 1 ? "" : "s"}, with the pages attached.` : `Coordinator to resolve ${list.length} item${list.length === 1 ? "" : "s"}.`}</li>)}
                <li>Then you decide. ICA never approves or denies.</li>
              </ol>
            </section>
          </div>
        </>
      )}

      <details className="rounded border p-3">
        <summary className="cursor-pointer font-semibold">All pages, as read ({c.pages.length})</summary>
        <ol className="mt-3 space-y-3">
          {c.pages.map((p) => (
            <li key={p.n} className="rounded border p-3">
              <div className="mb-2 flex flex-wrap items-center gap-2 text-xs">
                <span className="font-semibold">Page {p.n}</span>
                <span className="rounded bg-gray-100 px-2">{p.type.replaceAll("_", " ")}</span>
                <span className={`rounded px-2 ${p.legibility === "good" ? "bg-green-100" : "bg-amber-100"}`}>legibility: {p.legibility}</span>
                {p.orientation !== "upright" && <span className="rounded bg-gray-100 px-2">{p.orientation.replace("_", " ")}</span>}
                {p.status !== "ok" && <span className="rounded bg-red-100 px-2">{p.status.replace("_", " ")}</span>}
                <a className="ml-auto text-blue-800 underline" href={`/api/pdf/${c.id}#page=${p.n}`} target="_blank">Open original page</a>
              </div>
              <pre className="whitespace-pre-wrap text-sm"><Marked text={p.text} /></pre>
            </li>
          ))}
        </ol>
      </details>
    </main>
  );
}
