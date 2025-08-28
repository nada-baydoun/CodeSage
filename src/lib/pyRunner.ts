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
      console.log('🔄 Loading Pyodide...');
      
      // Inject pyodide script if not present
      if (typeof window.loadPyodide !== 'function') {
        console.log('📦 Injecting Pyodide script...');
        await new Promise<void>((res, rej) => {
          const s = document.createElement('script');
          // Use a more stable version
          s.src = 'https://cdn.jsdelivr.net/pyodide/v0.24.1/full/pyodide.js';
          s.async = true;
          s.onload = () => {
            console.log('✅ Pyodide script loaded');
            res();
          };
          s.onerror = () => rej(new Error('Failed to load Pyodide script'));
          document.head.appendChild(s);
        });
      }
      
      if (!window.loadPyodide) {
        throw new Error('Pyodide loader not available on window');
      }
      
      console.log('🚀 Initializing Pyodide...');
      const py = await window.loadPyodide({ 
        indexURL: 'https://cdn.jsdelivr.net/pyodide/v0.24.1/full/'
      });
      
      console.log('✅ Pyodide initialized successfully');
      resolve(py);
      
    } catch (err) {
      console.error('❌ Failed to load Pyodide:', err);
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

// Normalize output for comparison: trim whitespace but preserve structure
export function normalizeOutput(s: string | undefined | null) {
  if (!s) return '';
  // Only trim leading/trailing whitespace, preserve internal structure
  return String(s).trim();
}

// removed unused helpers

export function outputsMatch(expectedRaw: string, producedRaw: string): boolean {
  // First, try exact match (case-sensitive)
  if (expectedRaw === producedRaw) {
    return true;
  }
  
  // Then try normalized match (trimmed only)
  const expectedNormalized = normalizeOutput(expectedRaw);
  const producedNormalized = normalizeOutput(producedRaw);
  
  if (expectedNormalized === producedNormalized) {
    return true;
  }
  
  // For numeric outputs, try to parse and compare as numbers, but only if both are purely numeric
  const numericOnly = /^[-+]?\d+(?:\.\d+)?$/;
  if (numericOnly.test(expectedNormalized) && numericOnly.test(producedNormalized)) {
    const expectedNum = parseFloat(expectedNormalized);
    const producedNum = parseFloat(producedNormalized);
    const epsilon = 1e-9;
    return Math.abs(expectedNum - producedNum) < epsilon;
  }
  
  // Check if both are arrays of numbers (extract all numeric tokens and compare element-wise)
  try {
    const expectedArray = expectedNormalized.match(/-?\d+(?:\.\d+)?/g);
    const producedArray = producedNormalized.match(/-?\d+(?:\.\d+)?/g);
    
    if (expectedArray && producedArray && expectedArray.length === producedArray.length) {
      for (let i = 0; i < expectedArray.length; i++) {
        const exp = parseFloat(expectedArray[i]);
        const prod = parseFloat(producedArray[i]);
        if (isNaN(exp) || isNaN(prod) || Math.abs(exp - prod) >= 1e-9) {
          return false;
        }
      }
      return true;
    }
  } catch {
    // If parsing fails, continue to other methods
  }
  
  // For space-separated outputs, try comparing as arrays of tokens (strict order)
  try {
    const expectedParts = expectedNormalized.split(/\s+/).filter(s => s.length > 0);
    const producedParts = producedNormalized.split(/\s+/).filter(s => s.length > 0);
    
    if (expectedParts.length === producedParts.length) {
      // If all tokens are numbers, compare numerically
      let allNumeric = true;
      for (let i = 0; i < expectedParts.length; i++) {
        const exp = parseFloat(expectedParts[i]);
        const prod = parseFloat(producedParts[i]);
        if (isNaN(exp) || isNaN(prod)) {
          allNumeric = false;
          break;
        }
        if (Math.abs(exp - prod) >= 1e-9) {
          return false;
        }
      }
      if (allNumeric) return true;
      
      // Otherwise compare tokens strictly
      for (let i = 0; i < expectedParts.length; i++) {
        if (expectedParts[i] !== producedParts[i]) {
          return false;
        }
      }
      return true;
    }
  } catch {
    // If splitting fails, continue
  }
  
  // Final fallback: strict string comparison fails
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
  try {
    console.log('🐍 Starting Python execution...');
    console.log('📝 User code length:', userCode.length);
    console.log('📥 Input setup:', inputSetup);
    
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
  # Execute user code first
  try:
    exec(USER_CODE, globals_ns)
  except Exception as e:
    result["exception"] = f"Code error: {e}"
    traceback.print_exc(file=buf_err)

  # Setup inputs as Python assignments (e.g., nums = [...]; target = ...)
  try:
    exec(INPUT_SETUP, globals_ns, globals_ns)
  except Exception:
    # Not all inputs are assignment style; ignore failures and rely on stdin
    pass

  # Try to get output from the code
  printed_out = buf_out.getvalue().strip()
  result["stdout"] = printed_out or ""
  
  # If no output was printed, try to find a main function or solution
  if not printed_out:
    try:
      # Look for common patterns
      if "main" in globals_ns and callable(globals_ns["main"]):
        globals_ns["main"]()
        printed_out = buf_out.getvalue().strip()
        result["stdout"] = printed_out
      elif "solve" in globals_ns and callable(globals_ns["solve"]):
        globals_ns["solve"]()
        printed_out = buf_out.getvalue().strip()
        result["stdout"] = printed_out
    except Exception as e:
      if not result["exception"]:
        result["exception"] = f"Function call error: {e}"
        traceback.print_exc(file=buf_err)

except Exception as e:
  if not result["exception"]:
    result["exception"] = f"Runtime error: {e}"
    traceback.print_exc(file=buf_err)
finally:
  sys.stdout, sys.stderr = old_out, old_err
  sys.stdin = old_in
  result["stderr"] = buf_err.getvalue()

json.dumps(result)
`;

    console.log('🚀 Executing Python code...');
    const out = pyodide.runPython(py);
    
    if (typeof out !== 'string') {
      console.error('❌ Pyodide returned non-string:', out);
      return { 
        stdout: '', 
        stderr: `Runner returned ${String(out)}`, 
        value: undefined, 
        exception: 'Pyodide execution failed' 
      };
    }
    
    console.log('✅ Python execution completed, parsing result...');
    const data: RunResult = JSON.parse(out);
    
    console.log('📊 Python execution result:', {
      stdout: data.stdout,
      stderr: data.stderr,
      exception: data.exception,
      value: data.value
    });
    
    return data;
    
  } catch (e) {
    console.error('❌ Python execution failed:', e);
    const msg = e && typeof e === 'object' && 'message' in e ? String((e as { message?: unknown }).message) : String(e);
    return { 
      stdout: '', 
      stderr: `Pyodide execution failed: ${msg}`, 
      value: undefined, 
      exception: `Pyodide execution failed: ${msg}` 
    };
  }
}
