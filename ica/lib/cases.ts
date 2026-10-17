import fs from "node:fs";
import path from "node:path";
import { CASES_DIR, UPLOADS_DIR, packetPath } from "./paths";
import { transcribe, type Page, type Usage } from "./transcribe";
import { review, type Review } from "./review";

export type Case = {
  id: string;
  source: { kind: "packet" | "upload"; name: string };
  status: "transcribing" | "reviewing" | "reviewed" | "error";
  progress: { done: number; total: number };
  pages: Page[];
  usage?: Usage; // transcription
  review?: Review;
  timings: { started: string; transcribe_s?: number; review_s?: number; seconds?: number };
  error?: string;
};

const live = new Map<string, Case>();

function save(c: Case) {
  fs.mkdirSync(CASES_DIR, { recursive: true });
  fs.writeFileSync(path.join(CASES_DIR, `${c.id}.json`), JSON.stringify(c, null, 2));
}

export function getCase(id: string): Case | null {
  if (!/^[\w-]+$/.test(id)) return null;
  if (live.has(id)) return live.get(id)!;
  try {
    return JSON.parse(fs.readFileSync(path.join(CASES_DIR, `${id}.json`), "utf8"));
  } catch {
    return null;
  }
}

export function listCases(): Case[] {
  let ids: string[] = [];
  try {
    ids = fs.readdirSync(CASES_DIR).filter((f) => f.endsWith(".json")).map((f) => f.slice(0, -5));
  } catch {}
  for (const id of live.keys()) if (!ids.includes(id)) ids.push(id);
  return ids.map(getCase).filter((c): c is Case => !!c).sort((a, b) => b.timings.started.localeCompare(a.timings.started));
}

export function pdfPath(c: Case) {
  return c.source.kind === "packet" ? packetPath(c.source.name) : path.join(UPLOADS_DIR, `${c.id}.pdf`);
}

const secs = (t0: number) => Math.round((Date.now() - t0) / 100) / 10;

async function runReview(c: Case) {
  c.status = "reviewing";
  const t0 = Date.now();
  c.review = await review(c.pages);
  c.timings.review_s = secs(t0);
  c.status = "reviewed";
}

function run(c: Case, work: () => Promise<void>) {
  live.set(c.id, c);
  const t0 = Date.now();
  (async () => {
    try {
      await work();
    } catch (e) {
      Object.assign(c, { status: "error", error: e instanceof Error ? e.message : String(e) });
    }
    c.timings.seconds = secs(t0);
    save(c);
    live.delete(c.id);
  })();
}

export function startCase(source: Case["source"], upload?: Uint8Array): Case {
  const id = `${source.kind === "packet" ? source.name : "upload"}-${Date.now().toString(36)}`;
  if (upload) {
    fs.mkdirSync(UPLOADS_DIR, { recursive: true });
    fs.writeFileSync(path.join(UPLOADS_DIR, `${id}.pdf`), upload);
  }
  const c: Case = { id, source, status: "transcribing", progress: { done: 0, total: 0 }, pages: [], timings: { started: new Date().toISOString() } };
  run(c, async () => {
    const t0 = Date.now();
    const r = await transcribe(fs.readFileSync(pdfPath(c)), (done, total) => (c.progress = { done, total }));
    Object.assign(c, { pages: r.pages, usage: r.usage });
    c.timings.transcribe_s = secs(t0);
    await runReview(c);
  });
  return c;
}

// Re-run only the review on pages already transcribed.
export function rerunReview(id: string): Case | null {
  const c = getCase(id);
  if (!c || !c.pages.length || live.has(id)) return null;
  c.error = undefined;
  run(c, () => runReview(c));
  return c;
}
