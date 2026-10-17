"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

type CaseRow = {
  id: string;
  source: { kind: string; name: string };
  status: string;
  progress: { done: number; total: number };
  timings: { started: string; seconds?: number };
  usage?: { cost: number };
  review?: { readiness: string; findings: { state: string; owner: string }[]; usage: { cost: number } };
  error?: string;
};
type Patterns = { n: number; waiting: Record<string, number>; total: number; top: { id: string; name: string; k: number }[] };

const READY: Record<string, [string, string]> = {
  exclusion_to_review: ["Exclusion to review", "bg-red-100 text-red-900"],
  needs_attention: ["Needs answers", "bg-amber-100 text-amber-900"],
  ready_for_decision: ["Ready for your decision", "bg-green-100 text-green-900"],
};
const OPEN = ["not_met", "conflicting", "not_found", "unreadable", "clinical_review", "conditional_unconfirmed", "cannot_determine"];
function waitingOn(c: CaseRow) {
  const f = (c.review?.findings ?? []).filter((x) => OPEN.includes(x.state) && x.owner !== "none");
  const n = (o: string) => f.filter((x) => x.owner === o).length;
  return [["Hospital", n("hospital")], ["LVN", n("lvn")], ["Coordinator", n("coordinator")]].filter(([, k]) => k).map(([o, k]) => `${o} ${k}`).join(" · ");
}

export default function Docket() {
  const [packets, setPackets] = useState<string[]>([]);
  const [cases, setCases] = useState<CaseRow[]>([]);
  const [pat, setPat] = useState<Patterns | null>(null);
  const [packet, setPacket] = useState("R05");
  const [msg, setMsg] = useState("");

  async function refresh() {
    const r = await fetch("/api/cases").then((r) => r.json());
    setPackets(r.packets);
    setCases(r.cases);
    setPat(r.patterns);
  }
  useEffect(() => {
    refresh();
    const t = setInterval(refresh, 2000);
    return () => clearInterval(t);
  }, []);

  async function start(body: BodyInit, json: boolean) {
    setMsg("");
    const r = await fetch("/api/cases", { method: "POST", body, headers: json ? { "content-type": "application/json" } : undefined });
    const j = await r.json();
    if (!r.ok) setMsg(j.error ?? "Could not start");
    refresh();
  }

  return (
    <main className="mx-auto max-w-4xl p-6 space-y-6">
      <header>
        <h1 className="text-2xl font-bold">ICA · Referral Readiness</h1>
        <p className="text-sm text-gray-600">Illumination Health + Home. Use de-identified packets only. ICA drafts and flags; the coordinator decides.</p>
      </header>

      <section className="rounded border p-4 space-y-3">
        <h2 className="font-semibold">Review a packet</h2>
        <div className="flex flex-wrap items-center gap-2">
          <label htmlFor="packet" className="text-sm">Official packet</label>
          <select id="packet" className="rounded border px-2 py-1" value={packet} onChange={(e) => setPacket(e.target.value)}>
            {packets.map((p) => <option key={p}>{p}</option>)}
          </select>
          <button className="rounded bg-blue-700 px-3 py-1 text-white" onClick={() => start(JSON.stringify({ packet }), true)}>Start review</button>
          <span className="mx-2 text-gray-400">or</span>
          <label htmlFor="upload" className="text-sm">Upload a de-identified PDF</label>
          <input id="upload" type="file" accept="application/pdf" className="text-sm" onChange={(e) => {
            const f = e.target.files?.[0];
            if (!f) return;
            const fd = new FormData();
            fd.append("file", f);
            start(fd, false);
            e.target.value = "";
          }} />
        </div>
        {packets.length === 0 && <p className="text-sm text-amber-700">No packets found in challenges/1-referral-intake/packets.</p>}
        {msg && <p className="text-sm text-red-700">{msg}</p>}
      </section>

      {pat && pat.n > 0 && (
        <section className="rounded border-2 border-blue-200 p-4 space-y-2">
          <h2 className="font-semibold">Patterns across the docket</h2>
          <p className="text-xs text-gray-600">Counted from ICA&apos;s first-pass reviews of {pat.n} referral{pat.n === 1 ? "" : "s"}. Not checked by a person. Not a trained model.</p>
          <p className="text-sm">
            <span className="font-semibold">Waiting on:</span> hospital {pat.waiting.hospital} · LVN {pat.waiting.lvn} · coordinator {pat.waiting.coordinator}
            <span className="text-gray-600"> of {pat.total} open items{pat.waiting.none ? ` (${pat.waiting.none} with no owner)` : ""}; dates that were blacked out are left out</span>
          </p>
          <div className="text-sm">
            <span className="font-semibold">Most often not in the packet:</span>
            <ul className="list-disc pl-5">{pat.top.map((g) => <li key={g.id}>{g.name}: {g.k} of {pat.n} <span className="font-mono text-xs">({g.id})</span></li>)}</ul>
          </div>
          <p className="text-sm font-semibold">Ask the hospital for these up front. Nothing is sent automatically.</p>
          <p className="text-xs text-gray-600">Items marked &quot;if needed&quot; may not apply to every referral.</p>
        </section>
      )}

      <section className="space-y-2">
        <h2 className="font-semibold">Docket</h2>
        {cases.length === 0 && <p className="text-sm text-gray-600">No referrals yet. Start one above.</p>}
        <ul className="divide-y rounded border">
          {cases.map((c) => (
            <li key={c.id} className="flex items-center justify-between gap-4 p-3">
              <Link href={`/case/${c.id}`} className="font-medium text-blue-800 underline">{c.source.name}</Link>
              <span className="text-sm">
                {c.status === "transcribing" ? `Reading page ${c.progress.done} of ${c.progress.total || "…"}`
                  : c.status === "reviewing" ? "Checking against IHH's criteria…"
                  : c.review ? <span className={`rounded px-2 py-0.5 ${READY[c.review.readiness][1]}`}>{READY[c.review.readiness][0]}</span>
                  : c.status}
                {c.review && <span className="ml-2 text-xs text-gray-700">waiting on: {waitingOn(c) || "no one"}</span>}
                {c.error && <span className="text-red-700"> · {c.error}</span>}
              </span>
              <span className="text-xs tabular-nums text-gray-600">
                {c.timings.seconds != null && `${c.timings.seconds}s`}
                {(c.usage || c.review) && ` · $${((c.usage?.cost ?? 0) + (c.review?.usage.cost ?? 0)).toFixed(2)}`}
              </span>
            </li>
          ))}
        </ul>
      </section>
    </main>
  );
}
