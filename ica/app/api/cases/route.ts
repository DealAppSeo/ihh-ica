import { connection } from "next/server";
import { listCases, startCase } from "@/lib/cases";
import { listPackets } from "@/lib/paths";

export async function GET() {
  await connection();
  const cases = listCases().map(({ pages, ...c }) => ({ ...c, pageCount: pages.length }));
  return Response.json({ packets: listPackets(), cases });
}

// Start a review: JSON {packet: "R05"} for an official packet, or a multipart upload with field "file".
export async function POST(req: Request) {
  const type = req.headers.get("content-type") ?? "";
  if (type.includes("multipart/form-data")) {
    const file = (await req.formData()).get("file");
    if (!(file instanceof File) || !file.name.toLowerCase().endsWith(".pdf")) {
      return Response.json({ error: "Upload a PDF." }, { status: 400 });
    }
    const c = startCase({ kind: "upload", name: file.name }, new Uint8Array(await file.arrayBuffer()));
    return Response.json({ id: c.id });
  }
  const { packet } = await req.json().catch(() => ({}));
  try {
    const c = startCase({ kind: "packet", name: String(packet) });
    return Response.json({ id: c.id });
  } catch (e) {
    return Response.json({ error: e instanceof Error ? e.message : "Bad request" }, { status: 400 });
  }
}
