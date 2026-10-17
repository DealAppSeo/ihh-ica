import { PDFDocument } from "pdf-lib";
import { claude, MODEL, cost } from "./claude";

export type PageType =
  | "fax_cover" | "ihh_referral_form" | "health_plan_auth" | "face_sheet" | "history_physical"
  | "progress_note" | "nursing_note" | "pt_ot_eval" | "medication_record" | "labs" | "imaging"
  | "consult" | "social_work" | "physician_orders" | "vitals" | "wound_care" | "other" | "blank";

export type Page = {
  n: number; // original page number in the PDF, 1-based
  text: string;
  type: PageType | "unknown";
  legibility: "good" | "partial" | "poor" | "unknown";
  orientation: "upright" | "rotated" | "upside_down" | "unknown";
  status: "ok" | "not_transcribed" | "refused";
};

export type Usage = { input_tokens: number; output_tokens: number; cost: number };

const CHUNK = 4; // pages per Claude call
const PARALLEL = 4; // calls in flight

const SYSTEM = `You transcribe faxed hospital referral pages for a recuperative-care intake coordinator. Accuracy matters more than fluency; a confident wrong transcription is the worst outcome.
Rules:
- Transcribe only what is on the page. Do not correct, interpret, complete or summarize.
- Pages may be sideways or upside down: read them upright.
- Black boxes are redactions made for privacy: write [REDACTED]. They are not missing information.
- A word you cannot read: [illegible]. A character or number you are not sure of: put [?] right after it, e.g. 140[?].
- Handwriting: transcribe it the same way, with the same markers.
- Tables: one row per line, cells separated by " | ".
- For every page in the document, in order, output exactly:
=== PAGE k ===
META type=<fax_cover|ihh_referral_form|health_plan_auth|face_sheet|history_physical|progress_note|nursing_note|pt_ot_eval|medication_record|labs|imaging|consult|social_work|physician_orders|vitals|wound_care|other|blank> legibility=<good|partial|poor> orientation=<upright|rotated|upside_down>
<the page text>
where k counts pages from 1 within this document. Output nothing else.`;

async function chunkPdf(src: PDFDocument, from: number, to: number) {
  const doc = await PDFDocument.create();
  const pages = await doc.copyPages(src, Array.from({ length: to - from }, (_, i) => from + i));
  pages.forEach((p) => doc.addPage(p));
  return Buffer.from(await doc.save()).toString("base64");
}

function parse(text: string, first: number, count: number): Page[] {
  const out: Page[] = [];
  const parts = text.split(/^=== PAGE (\d+) ===\s*$/m);
  for (let i = 1; i < parts.length; i += 2) {
    const k = Number(parts[i]);
    if (!(k >= 1 && k <= count)) continue;
    const body = parts[i + 1] ?? "";
    const meta = body.match(/^\s*META\s+(.*)$/m)?.[1] ?? "";
    const get = (key: string) => meta.match(new RegExp(`${key}=(\\w+)`))?.[1];
    out.push({
      n: first + k - 1,
      text: body.replace(/^\s*META\s+.*$/m, "").trim(),
      type: (get("type") as PageType) ?? "unknown",
      legibility: (get("legibility") as Page["legibility"]) ?? "unknown",
      orientation: (get("orientation") as Page["orientation"]) ?? "unknown",
      status: "ok",
    });
  }
  return out;
}

async function transcribeRange(src: PDFDocument, from: number, to: number, usage: Usage): Promise<Page[]> {
  const data = await chunkPdf(src, from, to);
  const msg = await claude()
    .messages.stream({
      model: MODEL,
      max_tokens: 32000,
      output_config: { effort: "low" },
      inference_geo: "us",
      system: SYSTEM,
      messages: [{
        role: "user",
        content: [
          { type: "document", source: { type: "base64", media_type: "application/pdf", data } },
          { type: "text", text: `Transcribe all ${to - from} pages.` },
        ],
      }],
    })
    .finalMessage();
  usage.input_tokens += msg.usage.input_tokens;
  usage.output_tokens += msg.usage.output_tokens;

  const count = to - from;
  if (msg.stop_reason === "max_tokens" && count > 1) {
    // Too much on these pages for one reply: split and retry.
    const mid = from + Math.ceil(count / 2);
    return [...(await transcribeRange(src, from, mid, usage)), ...(await transcribeRange(src, mid, to, usage))];
  }
  const text = msg.content.map((b) => (b.type === "text" ? b.text : "")).join("");
  const got = parse(text, from + 1, count);
  // Never invent a page: anything not returned is marked, not filled.
  const status: Page["status"] = msg.stop_reason === "refusal" ? "refused" : "not_transcribed";
  for (let n = from + 1; n <= to; n++) {
    if (!got.some((p) => p.n === n)) got.push({ n, text: "", type: "unknown", legibility: "unknown", orientation: "unknown", status });
  }
  return got.sort((a, b) => a.n - b.n);
}

export async function transcribe(pdf: Uint8Array, onProgress: (done: number, total: number) => void) {
  const src = await PDFDocument.load(pdf, { ignoreEncryption: true });
  const total = src.getPageCount();
  const ranges: [number, number][] = [];
  for (let i = 0; i < total; i += CHUNK) ranges.push([i, Math.min(i + CHUNK, total)]);

  const usage: Usage = { input_tokens: 0, output_tokens: 0, cost: 0 };
  const pages: Page[] = [];
  let done = 0;
  onProgress(0, total);
  let next = 0;
  async function worker() {
    while (next < ranges.length) {
      const [a, b] = ranges[next++];
      pages.push(...(await transcribeRange(src, a, b, usage)));
      done += b - a;
      onProgress(done, total);
    }
  }
  await Promise.all(Array.from({ length: Math.min(PARALLEL, ranges.length) }, worker));
  usage.cost = cost(usage);
  return { pages: pages.sort((a, b) => a.n - b.n), total, usage };
}
