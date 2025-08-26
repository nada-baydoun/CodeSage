"use client";

// Centralized localStorage-based problem status management
// Status values align with Problems page
export type Status = "none" | "viewed" | "tried" | "accepted" | "rejected";

const STORAGE_KEY = "cf-status";
const ORDER: Status[] = ["none", "viewed", "tried", "accepted", "rejected"];

function isClient() {
  return typeof window !== "undefined" && typeof localStorage !== "undefined";
}

export function loadStatusMap(): Record<string, Status> {
  if (!isClient()) return {};
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    const parsed = raw ? JSON.parse(raw) : {};
    const out: Record<string, Status> = {};
    const allowed = new Set<Status>(["none", "viewed", "tried", "accepted", "rejected"]);
    for (const [k, v] of Object.entries(parsed || {})) {
      out[k] = allowed.has(v as Status) ? (v as Status) : "none";
    }
    return out;
  } catch {
    return {};
  }
}

export function saveStatusMap(map: Record<string, Status>) {
  if (!isClient()) return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(map));
  } catch {
    // ignore quota or privacy mode errors
  }
}

export function getStatus(id: string): Status {
  const map = loadStatusMap();
  return map[id] ?? "none";
}

export function setStatus(id: string, status: Status) {
  if (!isClient()) return;
  const map = loadStatusMap();
  map[id] = status;
  saveStatusMap(map);
}

export function upgradeStatus(id: string, next: Status) {
  if (!isClient()) return;
  const map = loadStatusMap();
  const cur = map[id] ?? "none";
  const curRank = ORDER.indexOf(cur);
  const nextRank = ORDER.indexOf(next);
  if (nextRank > curRank) {
    map[id] = next;
    saveStatusMap(map);
  }
}
