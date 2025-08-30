import { NextResponse } from "next/server";
import OpenAI from "openai";
import { env } from "@/config/env";
import fs from "node:fs/promises";
import path from "node:path";

type HintRequest = {
  language?: string;
  lineNumber?: number;
  lineText?: string;
  snippet?: string;
  problem?: { id?: string; name?: string; statement?: string };
};

type ProblemsetItem = {
  id?: string; contestId?: number; index?: string; name?: string; rating?: number; tags?: string[];
  // and possibly more fields in future
  [k: string]: any;
};

// Cache large JSON files in-memory
let problemsetCache: Map<string, ProblemsetItem> | null = null;
let thinkingCache: any | null = null; // keyed by problem id if possible
let checkerCache: any | null = null;  // keyed by problem id if possible

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
  try {
    thinkingCache = await loadJSON("public/data/thinking.json");
  } catch {
    thinkingCache = {};
  }
  return thinkingCache;
}

async function getChecker() {
  if (checkerCache) return checkerCache;
  try {
    checkerCache = await loadJSON("public/data/checker1.json");
  } catch {
    checkerCache = {};
  }
  return checkerCache;
}

function pickThinkingStepFirst(thinking: any, problemId?: string): string | undefined {
  if (!thinking || !problemId) return undefined;
  // Try: thinking[problemId].thinking_steps[0]
  const entry = thinking[problemId];
  if (entry && Array.isArray(entry.thinking_steps) && entry.thinking_steps.length) {
    const first = String(entry.thinking_steps[0] ?? "");
    return first || undefined;
  }
  // Fallback: array of entries with id
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
  // Try: checker[problemId].solutions: string[] or objects with code
  const entry = checker[problemId];
  if (entry) {
    if (Array.isArray(entry.solutions)) {
      return entry.solutions.map((s: any) => (typeof s === "string" ? s : s?.code || "")).filter(Boolean).slice(0, 4);
    }
    if (Array.isArray(entry)) {
      return entry.map((s: any) => (typeof s === "string" ? s : s?.code || "")).filter(Boolean).slice(0, 4);
    }
  }
  // Fallback: array with {id, solutions}
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
    const body = (await req.json()) as HintRequest;
    const language = body.language || "python";
    const lineText = (body.lineText || "").toString();
    const snippet = (body.snippet || "").toString();
    const problemId = body.problem?.id || ""; // e.g., "306/A"
    const problemName = body.problem?.name || "";
    const problemStatement = body.problem?.statement || "";

  // Quick exits: if there's no meaningful input, or the line is empty/comment-only, do not hint
  const trimmedLine = lineText.trim();
  if ((!trimmedLine && !snippet.trim()) || /^#/.test(trimmedLine)) {
      return NextResponse.json({ needHint: false, hint: "", errorClasses: [], report: null }, { status: 200 });
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

    // Lightweight Python-line heuristics to reduce false positives
    const isPython = (language || '').toLowerCase().includes('python');
    const requiresColonRe = /^(if|elif|else|for|while|try|except|finally|with|def|class)\b/;
    const likelyBenignPythonLine = (ln: string): boolean => {
      const t = ln.trim();
      if (!t || t.startsWith('#')) return true;
      if (/^(import\s+\w+|from\s+\w[\w\.]*\s+import\s+)/.test(t)) return true;
      if (/^(pass|continue|break)\b/.test(t)) return true;
      if (/^print\s*\(/.test(t)) return true;
      if (/^[A-Za-z_]\w*\s*(\[[^\]]*\])?\s*=\s*[^=].*$/.test(t)) return true; // simple assignment
      if (/^return\b/.test(t)) return true;
      if (/^[A-Za-z_]\w*$/.test(t)) return true; // lone identifier
      if (/^\d+(\.\d+)?$/.test(t)) return true; // lone number
      if (requiresColonRe.test(t) && /:\s*$/.test(t)) return true; // correct control header
      return false;
    };

  // Clear definitions and strict focus on the CURRENT LINE to reduce false positives
    const sys = [
      "You are the best personal teacher assistant for competitive programming.",
      "Task: At each Enter press, judge ONLY the CURRENT LINE typed by the user.",
      "FIRST decide if a hint is needed for THIS LINE; if the line is okay or neutral, respond needHint=false.",
      "If uncertain in any way, respond needHint=false.",
      "Ignore issues in other lines unless they directly make THIS line incorrect (e.g., a variable from above is clearly undefined at this line).",
      "Only if needed, produce a SINGLE LINE hint.",
  "Classify error types precisely before hinting:",
      "- syntax: malformed constructs (e.g., wrong if/for/while syntax, missing colon/brackets/parentheses, bad operators/assignment, indentation errors in Python).",
      "- logical: wrong math relations, wrong mathematical formula, off-by-one, incorrect condition/transition, misuse of data structure operations, incorrect state updates.",
      "- runtime: might raise at execution (e.g., division by zero, index out of range, None access).",
      "- tle: algorithmic approach likely too slow for constraints.",
  "- missing_concept: user likely lacks a key idea (e.g., DP, two pointers, prefix sums).",
  "- knowledge_gap: the user seems to miss general language or API knowledge needed for this line.",
  "- other: does not fit the above but is a coding-related issue.",
      "Multiple issues may exist on the same line; include all applicable categories in errorClasses and condense the guidance into ONE question.",
      "Never reveal the solutions. Keep hint to 1 line (<= 120 chars) and the hint should be in the form of a non-trivial question.",
      "Vary phrasing; do NOT always start questions with 'Are you sure'. Use precise, helpful language.",
      "If the line is blank or starts with a comment, always return needHint=false.",
      "Always make the hint a question, example: when the user makes an error in an index, instead of correcting the error say: are you sure that you can access the elements that way? - another example if the user missed a semicolon or incorrectly initialized a matrix or wrote a wrong if else statement, say something like: are you sure about the way you wrote the code?",
      "Never make a hint that is very straightforward or else no one will learn anything", 
      "Respond ONLY as strict JSON: { needHint: boolean, errorClasses: string[], hint: string }.",
    ].join(" \n");

    const userSections: string[] = [];
  // Include all materials the user requested
  if (problemName) userSections.push(`Problem: ${problemName}`);
  if (problemStatement) userSections.push(`Problem description (truncated): ${problemStatement.slice(0, 1400)}`);
  if (psItem) userSections.push(`Problem meta (without name): ${JSON.stringify(psForReport).slice(0, 1000)}`);
  if (thinking1) userSections.push(`Thinking_steps[0]: ${thinking1}`);
  if (checkerVariants.length) userSections.push(`checker1 variants (truncated):\n${checkerVariants.map(s => s.slice(0, 600)).join("\n---\n")}`);
  if (snippet) userSections.push(`User code context (${language}):\n${snippet.slice(0, 25000)}`);
  if (lineText) userSections.push(`Current line: ${lineText}`);
  userSections.push("FIRST: decide if a hint is needed. If needHint=false, set hint to empty string.");

  const user = userSections.join("\n\n");

    // Ask model for a strict JSON classification
    let jsonText = "";
    try {
      const r = await openai.responses.create({
        model: "gpt-4o-mini",
        input: [
          { role: "system", content: sys },
          { role: "user", content: user },
        ],
        max_output_tokens: 200,
      } as any);
      jsonText = (r as any)?.output?.[0]?.content?.[0]?.text || "";
    } catch {
      const r = await openai.chat.completions.create({
        model: "gpt-4o-mini",
        messages: [
          { role: "system", content: sys },
          { role: "user", content: user },
        ],
        max_tokens: 180,
        temperature: 0.0,
      });
      jsonText = r.choices?.[0]?.message?.content || "";
    }

    // Extract JSON if wrapped in code fences
    const match = jsonText.match(/\{[\s\S]*\}/);
    const jsonClean = match ? match[0] : jsonText;
    let parsed: any = {};
    try {
      parsed = JSON.parse(jsonClean);
    } catch {
      parsed = { needHint: false, errorClasses: [], hint: "" };
    }

  let needHint = Boolean(parsed?.needHint);
  let hint: string = (parsed?.hint ?? "").toString();
  const allowed = new Set(["syntax","logical","runtime","tle","missing_concept","knowledge_gap","other"]);
  let errorClasses: string[] = Array.isArray(parsed?.errorClasses)
    ? parsed.errorClasses.map((s: any) => String(s).toLowerCase()).filter((c: string) => allowed.has(c))
    : [];

    // Enforce one-line, short hint when needed
    if (needHint) {
      // Require at least one valid error class; else suppress the hint
      if (!errorClasses.length) {
        needHint = false;
      }
      // If the line looks benign in Python, suppress hints unless it's clearly syntax/runtime related
      if (needHint && isPython && likelyBenignPythonLine(trimmedLine)) {
        const critical = new Set(["syntax","runtime"]);
        const hasCritical = errorClasses.some((c) => critical.has(c));
        if (!hasCritical) {
          needHint = false;
        }
      }
      hint = hint.replace(/\r?\n/g, " ").trim();
      if (hint.length > 120) hint = hint.slice(0, 117) + "...";
      // Suppress hints that reveal an answer or explicit code; crude heuristic
      const lower = hint.toLowerCase();
      if (/return\s+|print\(|the answer is|use exactly|replace with|do this:/.test(lower)) {
        needHint = false;
        hint = "";
        errorClasses = [];
      }
    } else {
      hint = "";
    }

    // Build the report JSON (flatten: include errorClasses, hint, and all problem fields except name at the top level)
    const report = needHint
      ? {
          errorClasses,
          hint,
          ...(psForReport || {}),
        }
      : null;

    // Persist report JSON when a hint is needed
    let reportPath: string | null = null;
    if (needHint) {
      try {
        const dir = path.join(process.cwd(), 'public', 'hints-info.json');
        await fs.mkdir(dir, { recursive: true });
        const safeId = (problemId || 'UNKNOWN').replace(/[^a-z0-9]/gi, '').toUpperCase();
        // Determine next hint index i by scanning existing files matching `${safeId}-hint-*.json`
        const files = await fs.readdir(dir).catch(() => [] as string[]);
        const re = new RegExp(`^${safeId}-hint-(\\d+)\\.json$`, 'i');
        let maxIdx = 0;
        for (const f of files) {
          const m = f.match(re);
          if (m) {
            const n = parseInt(m[1], 10);
            if (!Number.isNaN(n)) maxIdx = Math.max(maxIdx, n);
          }
        }
        const nextIdx = maxIdx + 1;
        const file = `${safeId}-hint-${nextIdx}.json`;
        await fs.writeFile(path.join(dir, file), JSON.stringify(report, null, 2), 'utf8');
        reportPath = `/hints-info.json/${file}`;
      } catch {
        // ignore persistence failures
      }
    }

    // Sanitize backticks for hover safety
    const safeHint = hint.replace(/```/g, "\\`\\`\\`");

    const payload: any = { needHint, hint: safeHint, errorClasses, report, reportPath };
    if (needHint) {
      // Include the exact prompt used so the client can display it in the console for this hint
      payload.promptSystem = sys;
      payload.promptUser = user;
    }

    return NextResponse.json(payload, { status: 200 });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
