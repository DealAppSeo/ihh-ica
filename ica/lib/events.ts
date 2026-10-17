import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { CASES_DIR } from "./paths";

export type Event = {
  at: string;
  role: "coordinator" | "lvn" | "hospital" | "house_manager";
  type: "check" | "decision" | "draft_marked_sent" | "response";
  rule_id?: string;
  value: string; // e.g. checked | wrong | accept | request_info | decline | hospital | lvn
  detail?: string; // reason or note, written by the person
  prev_hash: string;
  hash: string;
};

const ROLES = ["coordinator", "lvn", "hospital", "house_manager"];
const TYPES = ["check", "decision", "draft_marked_sent", "response"];

// Append-only, hash-chained log: tamper-evident (a changed line breaks the chain), not signed.
export function appendEvent(id: string, input: Pick<Event, "role" | "type" | "rule_id" | "value" | "detail">) {
  if (!/^[\w-]+$/.test(id) || !ROLES.includes(input.role) || !TYPES.includes(input.type) || !input.value) {
    throw new Error("Bad event");
  }
  if (input.type === "decision" && !input.detail?.trim()) {
    throw new Error("A decision needs a reason.");
  }
  const file = path.join(CASES_DIR, `${id}.json`);
  const c = JSON.parse(fs.readFileSync(file, "utf8"));
  const events: Event[] = c.events ?? [];
  const prev_hash = events.at(-1)?.hash ?? "genesis";
  const body = { at: new Date().toISOString(), ...input, detail: input.detail?.slice(0, 1000), prev_hash };
  const hash = crypto.createHash("sha256").update(JSON.stringify(body)).digest("hex");
  events.push({ ...body, hash });
  c.events = events;
  fs.writeFileSync(file, JSON.stringify(c, null, 2));
  return events;
}

export function verifyChain(events: Event[] = []) {
  let prev = "genesis";
  for (const e of events) {
    const { hash, ...body } = e;
    if (body.prev_hash !== prev || crypto.createHash("sha256").update(JSON.stringify(body)).digest("hex") !== hash) return false;
    prev = hash;
  }
  return true;
}
