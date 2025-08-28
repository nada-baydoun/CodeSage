/* src/workers/pyodide-worker.js */
// Loads Pyodide once per tab and executes Python with captured stdin/stdout.
// Supports an optional `prelude` (e.g., random seeding) injected before the code.

let __pyodidePromise = null;

async function ensurePyodide() {
  if (!__pyodidePromise) {
    self.importScripts("https://cdn.jsdelivr.net/pyodide/v0.24.1/full/pyodide.js");
  // @ts-expect-error - loadPyodide provided by imported script
    __pyodidePromise = self.loadPyodide({ indexURL: "https://cdn.jsdelivr.net/pyodide/v0.24.1/full/" });
  }
  return __pyodidePromise;
}

self.onmessage = async (ev) => {
  const { id, code, input = "", prelude = "" } = ev.data || {};
  try {
    const pyodide = await ensurePyodide();

    const program = `
import sys, io
_stdout = io.StringIO()
_stderr = io.StringIO()
sys.stdout = _stdout
sys.stderr = _stderr
sys.stdin  = io.StringIO(${JSON.stringify(input)})
${prelude}
CODE_SRC = ${JSON.stringify(code)}
ns = {}
exec(CODE_SRC, ns, ns)
result = {"out": _stdout.getvalue(), "err": _stderr.getvalue()}
`;

    await pyodide.runPythonAsync(program);
    const result = pyodide.globals.get("result").toJs();
    self.postMessage({ id, ok: true, out: result.out, err: result.err });
  } catch (e) {
    self.postMessage({ id, ok: false, error: String(e && e.message ? e.message : e) });
  }
};
