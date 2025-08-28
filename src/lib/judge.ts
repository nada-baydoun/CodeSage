// src/lib/judge.ts
export type Checker = {
  id: string;
  generator?: { exists: boolean; code: string };
  best_solution: string; // Python ref solution (uses input()/print())
};

export type TestCase = { input: string; expected: string; got: string; pass: boolean; diff?: string; };
export type JudgeResult = { accepted: boolean; seed: number; cases: TestCase[]; };

class PyWorker {
  private worker: Worker;
  private inflight = new Map<
    string,
    {
      resolve: (result: { out: string; err: string }) => void;
      reject: (error: Error) => void;
      timer?: ReturnType<typeof setTimeout>;
    }
  >();
  constructor(private timeoutMs = 2500) {
    this.worker = new Worker(new URL("../workers/pyodide-worker.js", import.meta.url), { type: "classic" });
    this.worker.onmessage = (ev: MessageEvent) => {
      const { id, ok, out, err, error } = ev.data || {};
      const rec = this.inflight.get(id);
      if (!rec) return;
      if (rec.timer) clearTimeout(rec.timer);
      this.inflight.delete(id);
      if (ok) {
        rec.resolve({ out, err });
      } else {
        rec.reject(new Error(error || "Execution error"));
      }
    };
  }
  run(code: string, input = "", prelude = ""): Promise<{ out: string; err: string }> {
    const id = Math.random().toString(36).slice(2);
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        this.inflight.delete(id);
        try { this.worker.terminate(); } catch {}
        reject(new Error("TIMEOUT"));
      }, this.timeoutMs);
      this.inflight.set(id, { resolve, reject, timer });
      this.worker.postMessage({ id, code, input, prelude });
    });
  }
}

// --- helpers ---
const normalize = (s: string) => (s ?? "").replace(/\r/g, "").trim().replace(/\s+/g, " ");

function makeDiff(exp: string, got: string) {
  const e = exp.split(/\n/);
  const g = got.split(/\n/);
  const len = Math.max(e.length, g.length);
  const rows: string[] = [];
  for (let i = 0; i < len; i++) {
    const L = (e[i] ?? "").trimEnd();
    const R = (g[i] ?? "").trimEnd();
    rows.push(L === R ? ` ${i + 1}| ${L}` : `-${i + 1}| ${L}\n+${i + 1}| ${R}`);
  }
  return rows.join("\n");
}

// Generate N inputs; if Python generator exists, run it with a deterministic seed.
export async function generateInputs(py: PyWorker, checker: Checker, count: number, seed: number) {
  const inputs: string[] = [];
  const prelude = `import random\nrandom.seed(${seed})`;

  if (checker.generator?.exists && checker.generator.code?.trim()) {
    for (let i = 0; i < count; i++) {
      const { out } = await py.run(checker.generator.code, "", prelude);
      inputs.push(out.split(/\n/)[0].trim());
    }
  } else {
    // Fallback for problems like 306/A: 1≤m≤100, n≥m, n≤100
    function mulberry32(a: number) {
      return function() {
        let t = (a += 0x6D2B79F5);
        t = Math.imul(t ^ (t >>> 15), t | 1);
        t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
        return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
      };
    }
    const rng = mulberry32(seed);
    for (let i = 0; i < count; i++) {
      const m = 1 + Math.floor(rng() * 100);
      const n = m + Math.floor(rng() * (100 - m + 1));
      inputs.push(`${n} ${m}`);
    }
  }
  return inputs;
}

export async function evaluateSubmission(
  checker: Checker,
  userCode: string,
  opts?: { numTests?: number; timeoutMs?: number; seed?: number }
): Promise<JudgeResult> {
  const numTests = Math.max(1, opts?.numTests ?? 20);
  const seed = opts?.seed ?? (Math.random() * 2 ** 31) | 0;
  const py = new PyWorker(opts?.timeoutMs ?? 2500);

  const inputs = await generateInputs(py, checker, numTests, seed);
  const cases: TestCase[] = [];

  for (const input of inputs) {
    let expected = "", got = "";
    try {
      expected = (await py.run(checker.best_solution, input + "\n")).out;
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e);
      expected = `__REF_ERROR__: ${msg}`;
    }
    try {
      got = (await py.run(userCode, input + "\n")).out;
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e);
      got = `__RUNTIME_ERROR__: ${msg}`;
    }

    const pass = normalize(got) === normalize(expected);
    cases.push({ input, expected: expected.trim(), got: got.trim(), pass, diff: pass ? undefined : makeDiff(expected.trim(), got.trim()) });
  }
  return { accepted: cases.every(c => c.pass), seed, cases };
}
