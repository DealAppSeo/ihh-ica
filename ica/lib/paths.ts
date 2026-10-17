import path from "node:path";
import fs from "node:fs";

const REPO = path.join(process.cwd(), "..");
export const PACKETS_DIR = path.join(REPO, "challenges", "1-referral-intake", "packets");
export const CRITERIA_FILE = path.join(REPO, "challenges", "1-referral-intake", "criteria", "admission-criteria.json");
export const DATA_DIR = path.join(process.cwd(), "data"); // git-ignored
export const CASES_DIR = path.join(DATA_DIR, "cases");
export const UPLOADS_DIR = path.join(DATA_DIR, "uploads");

// Official packets are read in place, by name only (no path traversal).
export function packetPath(name: string) {
  if (!/^R(0[1-9]|1[01])$/.test(name)) throw new Error(`Unknown packet ${name}`);
  return path.join(PACKETS_DIR, `${name}.pdf`);
}

export function listPackets() {
  try {
    return fs.readdirSync(PACKETS_DIR).filter((f) => /^R\d\d\.pdf$/.test(f)).map((f) => f.slice(0, 3)).sort();
  } catch {
    return [];
  }
}
