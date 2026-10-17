import fs from "node:fs";
import { getCase, pdfPath } from "@/lib/cases";

// Serves the original PDF so a person can check the real page (open with #page=N). Read in place, never copied.
export async function GET(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  const c = getCase(id);
  if (!c) return new Response("Not found", { status: 404 });
  const bytes = fs.readFileSync(pdfPath(c));
  return new Response(bytes, {
    headers: { "content-type": "application/pdf", "content-disposition": "inline", "cache-control": "no-store" },
  });
}
