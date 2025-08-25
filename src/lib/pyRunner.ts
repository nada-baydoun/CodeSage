// Lightweight Pyodide loader and Python runner for client-side code execution
// Loads Pyodide from CDN once and exposes a helper to run user code with an input setup.

let pyodidePromise: Promise<{
  globals: { set: (k: string, v: unknown) => void };
  runPython: (code: string) => unknown;
}> | null = null;

declare global {
  interface Window {
    loadPyodide?: (opts?: { indexURL?: string }) => Promise<{
      globals: { set: (k: string, v: unknown) => void };
      runPython: (code: string) => unknown;
    }>;
  }
}

async function ensurePyodideLoaded() {
  if (pyodidePromise) return pyodidePromise;
  pyodidePromise = new Promise(async (resolve, reject) => {
    try {
      // Inject pyodide script if not present
      if (typeof window.loadPyodide !== 'function') {
        await new Promise<void>((res, rej) => {
          const s = document.createElement('script');
          s.src = 'https://cdn.jsdelivr.net/pyodide/v0.26.2/full/pyodide.js';
          s.async = true;
          s.onload = () => res();
          s.onerror = () => rej(new Error('Failed to load Pyodide script'));
          document.head.appendChild(s);
        });
      }
  if (!window.loadPyodide) throw new Error('Pyodide loader not available on window');
  const py = await window.loadPyodide({ indexURL: 'https://cdn.jsdelivr.net/pyodide/v0.26.2/full/' });
      resolve(py);
    } catch (err) {
      reject(err);
    }
  });
  return pyodidePromise;
}

export type RunResult = {
  stdout: string;
  stderr: string;
  value?: string; // JSON string if possible, else repr
  exception?: string | null;
};

// Normalize output for lenient comparison: trim and collapse whitespace
export function normalizeOutput(s: string | undefined | null) {
  if (!s) return '';
  return String(s).trim().replace(/\s+/g, '');
}

function coerceToJsonLike(str: string) {
  let s = str.trim();
  // Replace Python tuples with JSON arrays
  s = s.replace(/^\(/, '[').replace(/\)$/, ']');
  // Replace single quotes with double quotes for JSON compatibility (best effort)
  s = s.replace(/'/g, '"');
  // Python booleans/None to JSON
  s = s.replace(/\bNone\b/g, 'null').replace(/\bTrue\b/g, 'true').replace(/\bFalse\b/g, 'false');
  return s;
}

function deepEqual(a: unknown, b: unknown) {
  if (a === b) return true;
  if (Array.isArray(a) && Array.isArray(b)) {
    if (a.length !== b.length) return false;
    for (let i = 0; i < a.length; i++) {
      if (!deepEqual(a[i], b[i])) return false;
    }
    return true;
  }
  if (a && b && typeof a === 'object' && typeof b === 'object') {
    const ak = Object.keys(a as Record<string, unknown>).sort();
    const bk = Object.keys(b as Record<string, unknown>).sort();
    if (ak.length !== bk.length) return false;
    for (let i = 0; i < ak.length; i++) {
      if (ak[i] !== bk[i]) return false;
      if (!deepEqual((a as Record<string, unknown>)[ak[i]], (b as Record<string, unknown>)[bk[i]])) return false;
    }
    return true;
  }
  return false;
}

function arrayMultisetEqual(a: unknown[], b: unknown[]) {
  if (a.length !== b.length) return false;
  const norm = (v: unknown) => (v && typeof v === 'object') ? JSON.stringify(v) : String(v);
  const sa = [...a].map(norm).sort();
  const sb = [...b].map(norm).sort();
  for (let i = 0; i < sa.length; i++) if (sa[i] !== sb[i]) return false;
  return true;
}

export function outputsMatch(expectedRaw: string, producedRaw: string): boolean {
  // Fast path: whitespace-insensitive string equality
  if (normalizeOutput(expectedRaw) === normalizeOutput(producedRaw)) return true;

  // Try JSON-coercion and deep comparisons
  const expCoerced = coerceToJsonLike(expectedRaw);
  const gotCoerced = coerceToJsonLike(producedRaw);
  try {
    const exp = JSON.parse(expCoerced);
    const got = JSON.parse(gotCoerced);
    if (deepEqual(exp, got)) return true;
    // If both are arrays of primitives, compare as multisets (order-insensitive)
    if (Array.isArray(exp) && Array.isArray(got)) {
      // Accept any order for arrays of primitives or simple JSON values
      if (arrayMultisetEqual(exp, got)) return true;
    }
  } catch {
    // ignore
  }
  return false;
}

// Some problem example inputs are like: "a = 1, b = 2" which isn't valid Python by itself.
// Convert commas separating assignments to newlines.
export function canonicalizeInputSetup(input: string) {
  // Replace ", <var>=" with "\n<var>=" while keeping commas inside brackets/quotes.
  // Heuristic: commas that are followed by optional spaces and an identifier + '=' at top level.
  // Simple safe approach for most examples:
  return input.replace(/,\s*(?=[A-Za-z_]\w*\s*=)/g, '\n');
}

export async function runPythonWithInput(userCode: string, inputSetup: string): Promise<RunResult> {
  const pyodide = await ensurePyodideLoaded();
  // Set the user code and input strings into the Python globals
  pyodide.globals.set('USER_CODE', userCode);
  pyodide.globals.set('INPUT_SETUP', inputSetup);
  pyodide.globals.set('RAW_INPUT', inputSetup);

  const py = `
import sys, io, json, traceback
result = {"stdout": "", "stderr": "", "exception": None, "value": None}
buf_out = io.StringIO()
buf_err = io.StringIO()
old_out, old_err = sys.stdout, sys.stderr
old_in = sys.stdin
sys.stdout, sys.stderr = buf_out, buf_err
sys.stdin = io.StringIO(RAW_INPUT)
globals_ns = {}
try:
  try:
    exec(USER_CODE, globals_ns)
  except Exception as e:
    result["exception"] = f"Code error: {e}"

  # Setup inputs as Python assignments (e.g., nums = [...]; target = ...)
  try:
    exec(INPUT_SETUP, globals_ns, globals_ns)
  except Exception:
    # Not all inputs are assignment style; ignore failures and rely on stdin
    pass

  res_value = None
  printed_out = None
  call_err = None
  try:
    # Try common patterns
    # 1) Class Solution with twoSum/two_sum/solve
    if "Solution" in globals_ns:
      try:
        sol = globals_ns["Solution"]()
        if hasattr(sol, "twoSum"):
          res_value = sol.twoSum(globals_ns.get("nums"), globals_ns.get("target"))
        elif hasattr(sol, "two_sum"):
          res_value = sol.two_sum(globals_ns.get("nums"), globals_ns.get("target"))
        elif hasattr(sol, "solve"):
          getattr(sol, "solve")()
          printed_out = buf_out.getvalue().strip()
      except Exception as e:
        call_err = f"Solution call error: {e}"

    # 2) Top-level functions twoSum/two_sum/solve
    if res_value is None and printed_out is None:
      try:
        if "twoSum" in globals_ns and callable(globals_ns["twoSum"]):
          res_value = globals_ns["twoSum"](globals_ns.get("nums"), globals_ns.get("target"))
        elif "two_sum" in globals_ns and callable(globals_ns["two_sum"]):
          res_value = globals_ns["two_sum"](globals_ns.get("nums"), globals_ns.get("target"))
        elif "solve" in globals_ns and callable(globals_ns["solve"]):
          globals_ns["solve"]()
          printed_out = buf_out.getvalue().strip()
      except Exception as e:
        call_err = f"Function call error: {e}"

    # 3) Fallback: whatever was printed during import/execution
    if res_value is None and printed_out is None:
      printed_out = buf_out.getvalue().strip()

    result["stdout"] = printed_out or ""
    if res_value is not None:
      try:
        result["value"] = json.dumps(res_value)
      except TypeError:
        result["value"] = repr(res_value)
    if call_err and not result["exception"]:
      result["exception"] = call_err
  except Exception as e:
    result["exception"] = f"Runtime error: {e}"
finally:
  sys.stdout, sys.stderr = old_out, old_err
  sys.stdin = old_in
  result["stderr"] = buf_err.getvalue()
json.dumps(result)
`;

  try {
    const out = pyodide.runPython(py);
    if (typeof out !== 'string') {
      return { stdout: '', stderr: `Runner returned ${String(out)}`, value: undefined, exception: 'Pyodide execution failed' };
    }
    const data: RunResult = JSON.parse(out);
    return data;
  } catch (e) {
    const msg = e && typeof e === 'object' && 'message' in e ? String((e as { message?: unknown }).message) : String(e);
    return { stdout: '', stderr: msg, value: undefined, exception: 'Pyodide execution failed' };
  }
}
