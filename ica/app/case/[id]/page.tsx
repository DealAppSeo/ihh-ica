"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";

type Page = { n: number; text: string; type: string; legibility: string; orientation: string; status: string };
type Case = {
  id: string;
  source: { name: string };
  status: string;
  progress: { done: number; total: number };
  pages: Page[];
  usage?: { input_tokens: number; output_tokens: number; cost: number };
  timings: { seconds?: number };
  error?: string;
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

export default function CasePage() {
  const { id } = useParams<{ id: string }>();
  const [c, setC] = useState<Case | null>(null);

  useEffect(() => {
    let stop = false;
    async function load() {
      const r = await fetch(`/api/cases/${id}`);
      if (!r.ok || stop) return;
      const j: Case = await r.json();
      setC(j);
      if (j.status === "transcribing") setTimeout(load, 2000);
    }
    load();
    return () => { stop = true; };
  }, [id]);

  if (!c) return <main className="p-6">Loading…</main>;
  const unclear = c.pages.filter((p) => p.legibility === "poor" || p.status !== "ok");

  return (
    <main className="mx-auto max-w-4xl p-6 space-y-4">
      <Link href="/" className="text-sm text-blue-800 underline">← Docket</Link>
      <h1 className="text-2xl font-bold">Referral {c.source.name}</h1>
      <p className="text-sm text-gray-700">
        {c.status === "transcribing" ? `Reading page ${c.progress.done} of ${c.progress.total || "…"}…` : `${c.pages.length} pages read`}
        {c.timings.seconds != null && ` in ${c.timings.seconds}s`}
        {c.usage && ` · ${c.usage.input_tokens.toLocaleString()} in / ${c.usage.output_tokens.toLocaleString()} out tokens · $${c.usage.cost.toFixed(2)}`}
      </p>
      {c.error && <p className="text-red-700">Error: {c.error}</p>}
      {unclear.length > 0 && (
        <p className="rounded bg-amber-50 p-2 text-sm">
          Check against the original: pages {unclear.map((p) => p.n).join(", ")} were hard to read or not transcribed.
        </p>
      )}
      <ol className="space-y-3">
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
    </main>
  );
}
