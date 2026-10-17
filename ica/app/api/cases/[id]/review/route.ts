import { rerunReview } from "@/lib/cases";

export async function POST(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  const c = rerunReview(id);
  return c ? Response.json({ id: c.id }) : Response.json({ error: "Not found, not transcribed, or already running" }, { status: 400 });
}
