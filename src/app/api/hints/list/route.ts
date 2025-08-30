import { NextResponse } from "next/server";
import fs from "node:fs/promises";
import path from "node:path";

type HintReport = {
  errorClasses?: string[];
  id?: string;
  contestId?: number;
  index?: string;
  [k: string]: any;
};

export async function GET() {
  try {
    const dir = path.join(process.cwd(), "public", "hints-info.json");
    let files: string[] = [];
    try {
      files = await fs.readdir(dir);
    } catch {
      return NextResponse.json({ byProblem: [], totalHints: 0, totalByClass: {} }, { status: 200 });
    }

    const jsonFiles = files.filter((f) => /-hint-\d+\.json$/i.test(f));
    const items: Array<{ safeId: string; file: string; report: HintReport | null }> = [];
    for (const f of jsonFiles) {
      const safeId = f.replace(/-hint-\d+\.json$/i, "");
      try {
        const txt = await fs.readFile(path.join(dir, f), "utf8");
        const report: HintReport = JSON.parse(txt);
        items.push({ safeId, file: f, report });
      } catch {
        items.push({ safeId, file: f, report: null });
      }
    }

    // Group by display id
    const groups = new Map<string, { id: string; safeId: string; count: number; errorCounts: Record<string, number> }>();
    const totalByClass: Record<string, number> = {};
    for (const it of items) {
      const rep = it.report || {};
      let displayId = (rep.id && String(rep.id)) || (rep.contestId && rep.index ? `${rep.contestId}/${rep.index}` : "");
      if (!displayId) displayId = it.safeId;
      const key = displayId;
      const g = groups.get(key) || { id: displayId, safeId: it.safeId, count: 0, errorCounts: {} };
      g.count += 1;
      const errs = Array.isArray(rep.errorClasses) ? rep.errorClasses.map((x) => String(x).toLowerCase()) : [];
      for (const e of errs) {
        g.errorCounts[e] = (g.errorCounts[e] || 0) + 1;
        totalByClass[e] = (totalByClass[e] || 0) + 1;
      }
      groups.set(key, g);
    }

    const byProblem = Array.from(groups.values()).sort((a, b) => a.id.localeCompare(b.id));
    const totalHints = items.length;
    return NextResponse.json({ byProblem, totalHints, totalByClass }, { status: 200 });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
