import { getCase } from "@/lib/cases";

export async function GET(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  const c = getCase(id);
  return c ? Response.json(c) : Response.json({ error: "Not found" }, { status: 404 });
}
