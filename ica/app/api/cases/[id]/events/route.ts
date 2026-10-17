import { appendEvent } from "@/lib/events";
import { getCase } from "@/lib/cases";

export async function POST(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  const c = getCase(id);
  if (!c) return Response.json({ error: "Not found" }, { status: 404 });
  if (c.status !== "reviewed") return Response.json({ error: "Wait for the review to finish." }, { status: 409 });
  try {
    const events = appendEvent(id, await req.json());
    return Response.json({ events });
  } catch (e) {
    return Response.json({ error: e instanceof Error ? e.message : "Bad request" }, { status: 400 });
  }
}
