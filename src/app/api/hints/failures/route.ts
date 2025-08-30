import { NextResponse } from "next/server";
import OpenAI from "openai";
import { env } from "@/config/env";
import fs from "node:fs/promises";
import path from "node:path";

type FailureAnalysisRequest = {
  language?: string;
  snippet?: string;
  problem?: { id?: string; name?: string; statement?: string };
  failedCases?: Array<{ index: number; input: string; expected: string; userOutput: string }>;
};

type ProblemsetItem = {
  id?: string; contestId?: number; index?: string; name?: string; rating?: number; tags?: string[];
  [k: string]: any;
};

let problemsetCache: Map<string, ProblemsetItem> | null = null;
let thinkingCache: any | null = null;
let checkerCache: any | null = null;

async function loadJSON(fileRel: string) {
  const p = path.join(process.cwd(), fileRel);
  const txt = await fs.readFile(p, "utf8");
  return JSON.parse(txt);
}

async function getProblemsetIndex(): Promise<Map<string, ProblemsetItem>> {
  if (problemsetCache) return problemsetCache;
  try {
    const arr: ProblemsetItem[] = await loadJSON("public/data/problemset_complete.json");
    const map = new Map<string, ProblemsetItem>();
    for (const it of arr) {
      if (it?.id) map.set(String(it.id), it);
      else if (it?.contestId && it?.index) map.set(`${it.contestId}/${it.index}`, it);
    }
    problemsetCache = map;
    return map;
  } catch {
    problemsetCache = new Map();
    return problemsetCache;
  }
}

async function getThinking() {
  if (thinkingCache) return thinkingCache;
  try { thinkingCache = await loadJSON("public/data/thinking.json"); } catch { thinkingCache = {}; }
  return thinkingCache;
}

async function getChecker() {
  if (checkerCache) return checkerCache;
  try { checkerCache = await loadJSON("public/data/checker1.json"); } catch { checkerCache = {}; }
  return checkerCache;
}

function pickThinkingStepFirst(thinking: any, problemId?: string): string | undefined {
  if (!thinking || !problemId) return undefined;
  const entry = thinking[problemId];
  if (entry && Array.isArray(entry.thinking_steps) && entry.thinking_steps.length) {
    return String(entry.thinking_steps[0] ?? "") || undefined;
  }
  if (Array.isArray(thinking)) {
    const match = thinking.find((x: any) => x?.id === problemId);
    if (match && Array.isArray(match.thinking_steps) && match.thinking_steps.length) {
      return String(match.thinking_steps[0] ?? "") || undefined;
    }
  }
  return undefined;
}

function pickCheckerVariants(checker: any, problemId?: string): string[] {
  if (!checker || !problemId) return [];
  const entry = checker[problemId];
  if (entry) {
    if (Array.isArray(entry.solutions)) {
      return entry.solutions.map((s: any) => (typeof s === "string" ? s : s?.code || "")).filter(Boolean).slice(0, 4);
    }
    if (Array.isArray(entry)) {
      return entry.map((s: any) => (typeof s === "string" ? s : s?.code || "")).filter(Boolean).slice(0, 4);
    }
  }
  if (Array.isArray(checker)) {
    const match = checker.find((x: any) => x?.id === problemId);
    if (match && Array.isArray(match.solutions)) {
      return match.solutions.map((s: any) => (typeof s === "string" ? s : s?.code || "")).filter(Boolean).slice(0, 4);
    }
  }
  return [];
}

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as FailureAnalysisRequest;
    const language = body.language || "python";
    const snippet = (body.snippet || "").toString();
    const problemId = body.problem?.id || "";
    const problemName = body.problem?.name || "";
    const problemStatement = body.problem?.statement || "";
    const failedCases = Array.isArray(body.failedCases) ? body.failedCases : [];

    if (!snippet.trim() || failedCases.length === 0) {
      return NextResponse.json({ analyses: [] }, { status: 200 });
    }

    const [ps, thk, chk] = await Promise.all([
      getProblemsetIndex(),
      getThinking(),
      getChecker(),
    ]);
    const psItem = problemId ? ps.get(problemId) : undefined;
    const psForReport = psItem
      ? Object.fromEntries(Object.entries(psItem).filter(([k]) => k !== "name"))
      : undefined;
    const thinking1 = pickThinkingStepFirst(thk, problemId);
    const checkerVariants = pickCheckerVariants(chk, problemId);

    const openai = new OpenAI({ apiKey: env.OPENAI_API_KEY });

    // System prompt: similar spirit to line-hints, but analyze FULL CODE and explain FAILED TESTS only.
    const sys = [
      "You are the best personal teacher assistant for competitive programming.",
      "Analyze the ENTIRE USER CODE together with the FAILED TEST CASES provided.",
      "Goal: For each failed test, explain concisely WHY it failed, grounded in the user's code.",
      "Do NOT provide the full solution or exact code. Focus on failure cause (logic, state, edge cases, off-by-one, constraints).",
      "Classify each explanation using categories: syntax, logical, runtime, tle, missing_concept, knowledge_gap, other.",
      "Output STRICT JSON: { analyses: Array<{ index: number, explanation: string, categories: string[] }> }.",
      "Constraints: explanation <= 240 chars; avoid explicit fixes like 'replace with' or 'return X'.",
    ].join(" \n");

    // Build user content with context and failed cases
    const userSections: string[] = [];
    if (problemName) userSections.push(`Problem: ${problemName}`);
    if (problemStatement) userSections.push(`Problem description (truncated): ${problemStatement.slice(0, 1400)}`);
    if (psItem) userSections.push(`Problem meta (without name): ${JSON.stringify(psForReport).slice(0, 1000)}`);
    if (thinking1) userSections.push(`Thinking_steps[0]: ${thinking1}`);
    if (checkerVariants.length) userSections.push(`checker1 variants (truncated):\n${checkerVariants.map(s => s.slice(0, 600)).join("\n---\n")}`);
    userSections.push(`Full code (${language}):\n${snippet.slice(0, 25000)}`);
    const failedBlock = failedCases.map(fc => (
      `- index: ${fc.index}\n  input: ${fc.input}\n  expected: ${fc.expected}\n  userOutput: ${fc.userOutput}`
    )).join("\n\n");
    userSections.push(`Failed tests:\n${failedBlock}`);
    userSections.push("Explain each failed test's cause precisely. Use the provided categories.");
    const user = userSections.join("\n\n");

    let jsonText = "";
    try {
      const r = await openai.responses.create({
        model: "gpt-4o-mini",
        input: [
          { role: "system", content: sys },
          { role: "user", content: user },
        ],
        max_output_tokens: 400,
      } as any);
      jsonText = (r as any)?.output?.[0]?.content?.[0]?.text || "";
    } catch {
      const r = await openai.chat.completions.create({
        model: "gpt-4o-mini",
        messages: [
          { role: "system", content: sys },
          { role: "user", content: user },
        ],
        max_tokens: 400,
        temperature: 0.1,
      });
      jsonText = r.choices?.[0]?.message?.content || "";
    }

    const match = jsonText.match(/\{[\s\S]*\}/);
    const jsonClean = match ? match[0] : jsonText;
    let parsed: any = {};
    try { parsed = JSON.parse(jsonClean); } catch { parsed = { analyses: [] }; }

    const allowed = new Set(["syntax","logical","runtime","tle","missing_concept","knowledge_gap","other"]);
    const analyses = Array.isArray(parsed?.analyses) ? parsed.analyses.map((a: any) => {
      const idx = Number.isFinite(a?.index) ? Number(a.index) : -1;
      let explanation = (a?.explanation ?? "").toString().replace(/\r?\n/g, " ").trim();
      if (explanation.length > 240) explanation = explanation.slice(0, 237) + "...";
      const lower = explanation.toLowerCase();
      if (/the answer is|use exactly|replace with|do this:/.test(lower)) explanation = "";
      const categories: string[] = Array.isArray(a?.categories)
        ? a.categories.map((s: any) => String(s).toLowerCase()).filter((c: string) => allowed.has(c))
        : [];
      return { index: idx, explanation, categories };
    }).filter((a: any) => a.index >= 0 && a.explanation) : [];

    const payload: any = { analyses };
    if (analyses.length) {
      payload.promptSystem = sys;
      payload.promptUser = user;
    }
    return NextResponse.json(payload, { status: 200 });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
