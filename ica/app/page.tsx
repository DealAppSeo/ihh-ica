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
  error?: string;
};

export default function Docket() {
  const [packets, setPackets] = useState<string[]>([]);
  const [cases, setCases] = useState<CaseRow[]>([]);
  const [packet, setPacket] = useState("R05");
  const [msg, setMsg] = useState("");

  async function refresh() {
    const r = await fetch("/api/cases").then((r) => r.json());
    setPackets(r.packets);
    setCases(r.cases);
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

      <section className="space-y-2">
        <h2 className="font-semibold">Docket</h2>
        {cases.length === 0 && <p className="text-sm text-gray-600">No referrals yet. Start one above.</p>}
        <ul className="divide-y rounded border">
          {cases.map((c) => (
            <li key={c.id} className="flex items-center justify-between gap-4 p-3">
              <Link href={`/case/${c.id}`} className="font-medium text-blue-800 underline">{c.source.name}</Link>
              <span className="text-sm">
                {c.status === "transcribing" ? `Reading page ${c.progress.done} of ${c.progress.total || "…"}` : c.status}
                {c.error && <span className="text-red-700"> · {c.error}</span>}
              </span>
              <span className="text-xs tabular-nums text-gray-600">
                {c.timings.seconds != null && `${c.timings.seconds}s`}{c.usage && ` · $${c.usage.cost.toFixed(2)}`}
              </span>
            </li>
          ))}
        </ul>
      </section>
    </main>
  );
}
