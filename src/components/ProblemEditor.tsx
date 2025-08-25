"use client";
import React, { useMemo, useState, useRef, useEffect } from "react";
import type { editor as MonacoEditorNS } from "monaco-editor";
import { Card } from "./ui/card";
import { Button } from "./ui/button";
import Editor from "@monaco-editor/react";
import { 
  Play, 
  Send, 
  Code2, 
  Timer, 
  Trophy, 
  Settings, 
  User, 
  Check,
  X,
  Loader2,
  Lightbulb,
  Target,
  Copy
} from "lucide-react";
import { runPythonWithInput, canonicalizeInputSetup, outputsMatch } from "../lib/pyRunner";

// Types for dynamic problem content
type Example = { input: string; output: string; explanation?: string };
type ProblemContent = {
  id: string;
  name: string;
  rating?: number;
  difficulty?: string;
  tags?: string[];
  statement?: string;
  examples?: Example[];
  constraints?: string[];
  hint?: string;
  companies?: string[];
  acceptance?: number;
  totalSubmissions?: string | number;
};

// Default sample problem (used when no data provided)
const defaultProblem: ProblemContent = {
  id: "p1",
  name: "Two Sum",
  difficulty: "Easy",
  tags: ["array", "hash-table"],
  statement:
    "Given an array of integers nums and an integer target, return indices of the two numbers such that they add up to target. You may assume that each input would have exactly one solution, and you may not use the same element twice. You can return the answer in any order.",
  examples: [
    { 
      input: "nums = [2,7,11,15], target = 9", 
      output: "[0,1]",
      explanation: "Because nums[0] + nums[1] == 9, we return [0, 1]."
    },
    { 
      input: "nums = [3,2,4], target = 6", 
      output: "[1,2]",
      explanation: "Because nums[1] + nums[2] == 6, we return [1, 2]."
    },
    { 
      input: "nums = [3,3], target = 6", 
      output: "[0,1]",
      explanation: "Because nums[0] + nums[1] == 6, we return [0, 1]."
    },
  ],
  constraints: [
    "2 ≤ nums.length ≤ 10⁴",
    "-10⁹ ≤ nums[i] ≤ 10⁹",
    "-10⁹ ≤ target ≤ 10⁹",
    "Only one valid answer exists."
  ],
  hint: "Try using a hash map to store complements and check as you iterate.",
  companies: ["Amazon", "Google", "Microsoft", "Apple"],
  acceptance: 51.3,
  totalSubmissions: "15.2M"
};

function ratingToDifficulty(r?: number): string | undefined {
  if (typeof r !== "number") return undefined;
  if (r <= 1200) return "Easy";
  if (r <= 1900) return "Medium";
  return "Hard";
}

// Abbreviate tags for compact display
const TAG_MAP: Record<string,string> = {
  "binary search":"BS","ternary search":"TS","two pointers":"TP","brute force":"BF","data structures":"DS",
  "dynamic programming":"DP","graphs":"GR","graph matchings":"GM","shortest paths":"SP","depth-first search":"DFS",
  "dfs and similar":"DFSS","breadth-first search":"BFS","disjoint set union":"DSU","math":"MATH","number theory":"NT",
  "combinatorics":"COMB","greedy":"GRD","divide and conquer":"DAC","constructive algorithms":"CA","strings":"STR",
  "bitmasks":"BIT","implementation":"IMP","hashing":"HASH","sortings":"SORT","geometry":"GEO","probabilities":"PROB",
  "interactive":"INT","trees":"TREE"
};

function abbrTag(tag: string) {
  const t = (tag || "").toLowerCase().trim();
  if (TAG_MAP[t]) return TAG_MAP[t];
  const m = t.match(/[a-z0-9]+/g) || [];
  const s = m.map(w => w[0]).join("").toUpperCase();
  return s || tag.slice(0,3).toUpperCase();
}

// Rating heat class bucket (match globals.css classes)
function ratingBucket(r: number) {
  const clamped = Math.min(Math.max(r, 800), 3500);
  const i = Math.round((clamped - 800) / 100);
  return 800 + i * 100;
}
function ratingHeatClass(r?: number) {
  if (!r) return undefined;
  return `rating-heat rating-h-${ratingBucket(r)}`;
}

export default function ProblemEditor({ problem }: { problem?: ProblemContent }) {
  const prob: ProblemContent = useMemo(() => {
    const merged: ProblemContent = {
      ...defaultProblem,
      ...(problem || {}),
      tags: problem?.tags ?? defaultProblem.tags,
      examples: problem?.examples ?? defaultProblem.examples,
      constraints: problem?.constraints ?? defaultProblem.constraints,
      companies: problem?.companies ?? defaultProblem.companies,
    };
    // Derive difficulty from rating if not provided
    if (!merged.difficulty) merged.difficulty = ratingToDifficulty(merged.rating) || defaultProblem.difficulty;
    return merged;
  }, [problem]);

  // Editor should start with only commented constraints (no starter code)
  const initialCode = `# Constraints:
${(prob.constraints ?? []).map((c) => `# - ${c}`).join("\n")}
`;

  const [code, setCode] = useState(initialCode);
  const [showHint, setShowHint] = useState(false);
  const [running, setRunning] = useState(false);
  const [runningRaw, setRunningRaw] = useState(false);
  const [results, setResults] = useState<string | null>(null);
  const [testStatuses, setTestStatuses] = useState<number[]>([]);
  const [userOutputs, setUserOutputs] = useState<string[]>([]);
  const [runOutput, setRunOutput] = useState<string>("");
  const [runError, setRunError] = useState<string>("");
  const [runInput, setRunInput] = useState<string>("");
  const [showRunPanel, setShowRunPanel] = useState<boolean>(false);
  const runInputRef = useRef<HTMLTextAreaElement | null>(null);
  const autoresizeRunInput = () => {
    const el = runInputRef.current;
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = Math.min(240, Math.max(28, el.scrollHeight)) + 'px';
  };
  // Fixed editor font size (no user controls to change it)
  const editorFontSize = 16;
  const [copied, setCopied] = useState<Record<string, boolean>>({});
  const editorRef = useRef<MonacoEditorNS.IStandaloneCodeEditor | null>(null);
  const [editorHeight, setEditorHeight] = useState<string | number>('800px');
  // Cleanup for wheel forwarding listener
  const wheelUnsubscribeRef = useRef<(() => void) | null>(null);
  // Protect the initial commented constraints from edits
  const protectedEndOffsetRef = useRef<number>(initialCode.length);
  const lastValidCodeRef = useRef<string>(initialCode);
  const isRevertingRef = useRef<boolean>(false);

  const flashCopied = (key: string, value: string) => {
    navigator.clipboard.writeText(value);
    setCopied((prev) => ({ ...prev, [key]: true }));
    setTimeout(() => {
      setCopied((prev) => ({ ...prev, [key]: false }));
    }, 900);
  };

  const runCode = async () => {
    setRunning(true);
    setResults(null);
    const n = (prob.examples ?? []).length;
    setTestStatuses(Array.from({ length: n }, () => 0));
    setUserOutputs(Array.from({ length: n }, () => ""));

    const examples = prob.examples ?? [];
    let passCount = 0;
    for (let i = 0; i < examples.length; i++) {
      const ex = examples[i];
      // Convert input example to Python assignments
      const inputSetup = canonicalizeInputSetup(ex.input || "");
      try {
        const res = await runPythonWithInput(lastValidCodeRef.current || code, inputSetup);
        if (res.exception) {
          setUserOutputs((prev) => {
            const next = [...prev];
            next[i] = `${res.exception}${res.stderr ? `\n${res.stderr}` : ''}`;
            return next;
          });
          setTestStatuses((prev) => {
            const next = [...prev];
            next[i] = 2;
            return next;
          });
          continue;
        }
        const produced = (res.value ?? res.stdout ?? "").toString();
        const expected = ex.output ?? "";
        const ok = outputsMatch(expected, produced);
        setUserOutputs((prev) => {
          const next = [...prev];
          next[i] = produced;
          return next;
        });
        setTestStatuses((prev) => {
          const next = [...prev];
          next[i] = ok ? 1 : 2;
          return next;
        });
        if (ok) passCount++;
      } catch {
        setTestStatuses((prev) => {
          const next = [...prev];
          next[i] = 2;
          return next;
        });
        setUserOutputs((prev) => {
          const next = [...prev];
          next[i] = "Runtime error";
          return next;
        });
      }
    }

    const total = examples.length;
    setResults(total > 0 ? `${passCount}/${total} test cases passed` : "Ran 0 sample tests");
    setRunning(false);
  };

  // Resize editor to fit content (no internal editor scroll)
  const resizeEditorToContent = () => {
    const ed = editorRef.current;
    if (!ed) return;
    try {
      const contentHeight = ed.getContentHeight ? ed.getContentHeight() : undefined;
      const height = Math.max(200, (contentHeight ?? 0));
      setEditorHeight(`${height}px`);
      ed.layout({ width: ed.getLayoutInfo().width, height });
    } catch {
      // ignore
    }
  };

  // Recompute when code changes
  useEffect(() => {
    // small timeout to wait for content updates
    const t = setTimeout(() => resizeEditorToContent(), 40);
    return () => clearTimeout(t);
  }, [code]);

  // Cleanup any editor-bound listeners on unmount
  useEffect(() => {
    return () => {
      try { wheelUnsubscribeRef.current?.(); } catch {}
    };
  }, []);

  const submitCode = () => {
    alert("🚀 Code submitted successfully! Real submission system coming soon.");
  };

  const runRaw = async (inputOverride?: string) => {
    setRunningRaw(true);
    setRunOutput("");
    setRunError("");
    try {
      // Run with optional stdin provided by user
      const stdinToUse = (inputOverride !== undefined ? inputOverride : runInput) ?? "";
      const res = await runPythonWithInput(lastValidCodeRef.current || code, stdinToUse);
      if (res.exception) {
        setRunError(`${res.exception}${res.stderr ? `\n${res.stderr}` : ''}`);
      }
      const produced = (res.value ?? res.stdout ?? "").toString();
      setRunOutput(produced);
    } catch (e) {
      const msg = e && typeof e === 'object' && 'message' in e ? String((e as { message?: unknown }).message) : String(e);
      setRunError(`Runner error: ${msg}`);
    } finally {
      setRunningRaw(false);
    }
  };

  const onClickRun = () => {
    setShowRunPanel(true);
    setRunOutput("");
    setRunError("");
    // focus input box shortly after render
    setTimeout(() => {
      runInputRef.current?.focus();
    }, 50);
  };

  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty.toLowerCase()) {
      case 'easy': return 'badge-easy';
      case 'medium': return 'badge-medium';
      case 'hard': return 'badge-hard';
      default: return 'badge-tag';
    }
  };

  return (
    <div className="min-h-screen bg-slate-950">
      {/* Navigation Header */}
      <header className="sticky top-0 z-50 border-b border-slate-800/50 glass-nav">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            {/* Logo & Navigation */}
            <div className="flex items-center space-x-8">
              <div className="flex items-center space-x-3">
                <div className="w-8 h-8 bg-gradient-to-r from-blue-500 to-purple-600 rounded-lg flex items-center justify-center">
                  <Code2 className="w-5 h-5 text-white" />
                </div>
                <span className="text-xl font-bold gradient-text">CodeSage</span>
              </div>
              
              <nav className="hidden md:flex space-x-6">
                <a href="#" className="text-blue-400 font-medium text-sm uppercase tracking-wide hover:text-blue-300 transition-colors">
                  Problems
                </a>
                <a href="#" className="text-slate-400 hover:text-blue-400 transition-colors text-sm uppercase tracking-wide">
                  Contests
                </a>
                <a href="#" className="text-slate-400 hover:text-blue-400 transition-colors text-sm uppercase tracking-wide">
                  Learn
                </a>
                <a href="#" className="text-slate-400 hover:text-blue-400 transition-colors text-sm uppercase tracking-wide">
                  Discuss
                </a>
              </nav>
            </div>

            {/* User Section */}
            <div className="flex items-center space-x-4">
              <Button 
                className="bg-slate-800/50 hover:bg-slate-700/50 text-slate-300 border border-slate-700/50"
              >
                <Settings className="w-4 h-4 mr-2" />
                Settings
              </Button>
              <div className="w-8 h-8 bg-gradient-to-r from-blue-500 to-purple-600 rounded-full flex items-center justify-center">
                <User className="w-4 h-4 text-white" />
              </div>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-6 py-6">
        {/* Problem Header */}
        <div className="mb-8">
          <div className="flex items-start justify-between mb-6">
            <div className="space-y-4">
              <div className="flex items-center flex-wrap gap-3">
                <h1 className="text-3xl font-bold text-slate-100 mr-1">{prob.name}</h1>
                {/* Difficulty/Rating chip */}
                {typeof prob.rating === 'number' ? (
                  <span className={`rating-heat ${ratingHeatClass(prob.rating) || ''}`} title={`Codeforces rating: ${prob.rating}`}>
                    {prob.rating}
                  </span>
                ) : (
                  prob.difficulty && (
                    <span className={`badge ${getDifficultyColor(prob.difficulty)}`}>
                      {prob.difficulty}
                    </span>
                  )
                )}

                {/* Abbreviated tags next to difficulty */}
                <div className="flex items-center flex-wrap gap-1">
                  {(prob.tags ?? []).map((tag) => (
                    <span key={tag} className="badge badge-tag text-xs py-0.5 px-2" title={tag}>
                      {abbrTag(tag)}
                    </span>
                  ))}
                </div>
              </div>
              
              {/* Removed submissions/companies row and duplicate full tag list */}
            </div>
          </div>
        </div>

        {/* Main Content - top smaller, editor larger so Monaco is big by default */}
        <div className="flex flex-col gap-6">
          {/* Top Panel - Problem Description (auto height, expand to fit) */}
          <div>
            {/* Problem Content */}
            <Card className="glass-card p-6 space-y-6 h-full overflow-auto">
              <div className="space-y-6">
                  {/* Problem Statement */}
                  <div className="problem-content">
                    <p className="text-slate-300 leading-relaxed text-base whitespace-pre-line">
                      {prob.statement ?? "No description available for this problem yet."}
                    </p>
                  </div>

                  {/* Examples */}
                  <div className="space-y-4">
                    <h3 className="text-lg font-semibold text-slate-100 flex items-center">
                      <Target className="w-5 h-5 mr-2 text-blue-400" />
                      Examples
                    </h3>
        <div className="flex gap-4 w-full overflow-visible">
                      {(prob.examples ?? []).map((example, i) => (
                        <div
                          key={i}
          className="rounded-xl overflow-hidden min-h-[130px] flex-1 min-w-0 flex flex-col bg-slate-900/50 border-2 border-white transition-all"
                        >
          <div className="px-3 py-1.5 border-b border-white">
                            <span className="text-xs font-extrabold uppercase tracking-wide text-pink-500">
                              Test Case {i + 1}
                            </span>
                          </div>

                          <div className="p-3 space-y-2 flex-1">
                            <div>
                              <div className="text-sm font-extrabold hot-pink mb-0.5 uppercase tracking-wide flex items-center">
                                <span>Input</span>
                                <span className="relative inline-flex items-center">
                                  <button
                                    type="button"
                                    onClick={() => flashCopied(`ex-${i}-in`, example.input)}
                                    className="ml-0.5 p-0 bg-transparent hover:bg-transparent focus:bg-transparent border-none outline-none ring-0 rounded inline-flex items-center hot-pink opacity-90 hover:opacity-100"
                                    title="Copy input"
                                    aria-label={`Copy input for test case ${i + 1}`}
                                  >
                                    {copied[`ex-${i}-in`] ? (
                                      <Check className="w-1 h-1 hot-pink transform scale-50" />
                                    ) : (
                                      <Copy className="w-1 h-1 transform scale-50 hot-pink" />
                                    )}
                                  </button>
                                  {copied[`ex-${i}-in`] && (
                                    <span className="absolute -top-3 left-1/2 -translate-x-1/2 animate-scale-in">
                                      <Check className="w-2 h-2 hot-pink transform scale-50" />
                                    </span>
                                  )}
                                </span>
                              </div>
                              <div className="font-mono text-white text-sm leading-snug whitespace-pre-wrap break-words">
                                {example.input}
                              </div>
                            </div>

                            <div>
                              <div className="text-sm font-extrabold hot-pink mb-0.5 uppercase tracking-wide flex items-center">
                                <span>Output</span>
                                <span className="relative inline-flex items-center">
                                  <button
                                    type="button"
                                    onClick={() => flashCopied(`ex-${i}-out`, example.output)}
                                    className="ml-0.5 p-0 bg-transparent hover:bg-transparent focus:bg-transparent border-none outline-none ring-0 rounded inline-flex items-center hot-pink opacity-90 hover:opacity-100"
                                    title="Copy output"
                                    aria-label={`Copy output for test case ${i + 1}`}
                                  >
                                    {copied[`ex-${i}-out`] ? (
                                      <Check className="w-1 h-1 hot-pink transform scale-50" />
                                    ) : (
                                      <Copy className="w-1 h-1 transform scale-50 hot-pink" />
                                    )}
                                  </button>
                                  {copied[`ex-${i}-out`] && (
                                    <span className="absolute -top-3 left-1/2 -translate-x-1/2 animate-scale-in">
                                      <Check className="w-2 h-2 hot-pink transform scale-50" />
                                    </span>
                                  )}
                                </span>
                              </div>
                              <div className="font-mono text-white text-sm leading-snug whitespace-pre-wrap break-words">
                                {example.output}
                              </div>
                            </div>

                            {example.explanation && (
                              <div>
                                <div className="text-[11px] font-extrabold text-pink-500 mb-0.5 uppercase tracking-wide">
                                  Explanation
                                </div>
                                <p className="text-slate-100 text-[11px] leading-snug whitespace-pre-wrap break-words">
                                  {example.explanation}
                                </p>
                              </div>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Constraints moved to editor initial comments; left-panel block removed */}
              </div>
            </Card>
          </div>

          {/* Bottom Panel - Editor and Test Results (auto height, page scrolls) */}
          <div className="flex flex-col gap-6">
            {/* Enhanced Code Editor */}
            <Card className="glass-card overflow-visible flex flex-col">
              {/* Editor Header with Language Selection */}
              <div className="bg-gradient-to-r from-slate-800/50 to-slate-700/50 px-6 py-4 border-b border-slate-700/50">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <Code2 className="w-5 h-5 text-blue-400" />
                    <span className="text-lg font-semibold text-slate-200">Code Editor</span>
                    <span className="badge badge-tag">Python</span>
                  </div>
                </div>
              </div>

              {/* Monaco Editor (fills remaining vertical space between header and footer) */}
              <div className="bg-slate-900/95 backdrop-blur-sm">
                <Editor
                  // Height driven by content so editor does not show scrollbars
                  height={String(editorHeight)}
                  defaultLanguage="python"
                  value={code}
                  theme="vs-dark"
                  options={{
                    fontSize: editorFontSize,
                    fontFamily: '"JetBrains Mono", "Fira Code", monospace',
                    fontLigatures: true,
                    minimap: { enabled: false },
                    scrollBeyondLastLine: false,
                    lineNumbers: "on",
                    renderLineHighlight: "all",
                    matchBrackets: "always",
                    autoClosingBrackets: "always",
                    rulers: [88],
                    guides: { indentation: true },
                    bracketPairColorization: { enabled: true },
                    padding: { top: 20, bottom: 20 },
                    smoothScrolling: true,
                    cursorBlinking: "phase",
                    cursorSmoothCaretAnimation: "on",
                    glyphMargin: false,
                    scrollbar: { vertical: 'hidden', horizontal: 'hidden' },
                    scrollBeyondLastColumn: 0,
                    overviewRulerBorder: false,
                    overviewRulerLanes: 0,
                    lineDecorationsWidth: 0,
                    colorDecorators: true,
                    wordWrap: "on",
                    tabSize: 4,
                    insertSpaces: true,
                    automaticLayout: true,
                    renderWhitespace: 'none'
                  }}
                  onChange={(value) => setCode(value || "")}
                  onMount={(editor) => {
                    editorRef.current = editor;
                    // initial resize
                    setTimeout(resizeEditorToContent, 20);
                    editor.onDidContentSizeChange(() => {
                      resizeEditorToContent();
                    });
                    // Keep a snapshot of valid code (used when reverting illegal edits)
                    try {
                      lastValidCodeRef.current = editor.getValue();
                      protectedEndOffsetRef.current = initialCode.length;
                    } catch {}

                    // Block edits inside the protected constraints header
                    try {
                      editor.onDidChangeModelContent((ev: { changes?: Array<{ rangeOffset: number }> }) => {
                        if (isRevertingRef.current) return;
                        const model = editor.getModel?.();
                        if (!model) return;
                        const protectedEnd = protectedEndOffsetRef.current ?? 0;
                        const violates = (ev?.changes ?? []).some((ch) => ch.rangeOffset < protectedEnd);
                        if (violates) {
                          // Revert to last valid content and place cursor at the first editable position
                          try {
                            isRevertingRef.current = true;
                            model.setValue(lastValidCodeRef.current);
                            const pos = model.getPositionAt(protectedEnd);
                            editor.setPosition(pos);
                          } finally {
                            isRevertingRef.current = false;
                          }
                          return;
                        }
                        // Accept change: update valid snapshot
                        lastValidCodeRef.current = model.getValue();
                      });
                    } catch {}

                    // Forward wheel events to window when editor has no internal scroll,
                    // so page scrolling continues even when the cursor is over the editor.
                    try {
                      const domNode = editor.getDomNode?.();
                      if (domNode) {
                        const wheelHandler: EventListener = (evt) => {
                          const ev = evt as WheelEvent;
                          // Determine if the editor can scroll internally
                          const info = editor.getLayoutInfo?.();
                          const scrollHeight = editor.getScrollHeight?.();
                          const canScrollInternally = !!(info && scrollHeight && scrollHeight > (info.height || 0));
                          if (!canScrollInternally) {
                            // Forward scrolling to the page
                            window.scrollBy({ top: ev.deltaY, left: 0, behavior: 'auto' });
                            ev.preventDefault();
                          }
                        };
                        domNode.addEventListener('wheel', wheelHandler, { passive: false });
                        wheelUnsubscribeRef.current = () => domNode.removeEventListener('wheel', wheelHandler);
                      }
                    } catch {
                      // ignore
                    }
                  }}
                />
              </div>

              {/* Editor Action Buttons */}
              <div className="px-6 py-5 bg-gradient-to-r from-slate-800/30 to-slate-700/30 border-t border-slate-700/50">
                <div className="flex items-center justify-between gap-4 flex-wrap">
                  <div className="flex items-center gap-3 flex-wrap">
                    <Button
                      variant="hint"
                      onClick={() => setShowHint(!showHint)}
                      className="rounded-full px-5 py-2.5 text-sm md:text-base backdrop-blur-md transition-all btn-hint"
                      title={showHint ? 'Hide hint' : 'Show hint'}
                      aria-label={showHint ? 'Hide hint' : 'Show hint'}
                    >
                      <Lightbulb className="w-4 h-4 md:w-5 md:h-5 mr-2" />
                      {showHint ? 'Hide Hint' : 'Hint'}
                    </Button>

                    <Button
                      variant="run"
                      onClick={onClickRun}
                      disabled={runningRaw}
                      className={`rounded-full px-6 py-2.5 text-sm md:text-base backdrop-blur-md transition-all ${runningRaw ? 'opacity-70 cursor-not-allowed' : ''}`}
                      title="Run your code (print/output shown below)"
                      aria-label="Run code"
                    >
                      {runningRaw ? (
                        <>
                          <Loader2 className="w-4 h-4 md:w-5 md:h-5 mr-2 animate-spin" />
                          Running...
                        </>
                      ) : (
                        <>
                          <Play className="w-4 h-4 md:w-5 md:h-5 mr-2" />
                          Run
                        </>
                      )}
                    </Button>

                    <Button
                      variant="check"
                      onClick={runCode}
                      disabled={running}
                      className={`rounded-full px-6 py-2.5 text-sm md:text-base backdrop-blur-md transition-all btn-check ${running ? 'opacity-70 cursor-not-allowed' : ''}`}
                      title="Check your solution against sample tests"
                      aria-label="Check solution"
                    >
                      {running ? (
                        <>
                          <Loader2 className="w-4 h-4 md:w-5 md:h-5 mr-2 animate-spin" />
                          Checking...
                        </>
                      ) : (
                        <>
                          <Check className="w-4 h-4 md:w-5 md:h-5 mr-2" />
                          Check
                        </>
                      )}
                    </Button>

                    <Button
                      variant="submit"
                      className="rounded-full px-6 py-2.5 text-sm md:text-base backdrop-blur-md transition-all btn-submit"
                      onClick={submitCode}
                      title="Submit your solution"
                      aria-label="Submit solution"
                    >
                      <Send className="w-4 h-4 md:w-5 md:h-5 mr-2" />
                      Submit
                    </Button>
                  </div>
                </div>

                {showHint && (
                  <div className="mt-4 p-4 bg-gradient-to-r from-yellow-500/10 to-amber-500/10 border border-yellow-500/20 rounded-xl animate-slide-up">
                    <div className="flex items-start space-x-3">
          <Lightbulb className="w-5 h-5 text-yellow-400 mt-0.5 flex-shrink-0" />
                      <div>
                        <h4 className="text-sm font-semibold text-yellow-300 mb-2">💡 Hint</h4>
                        <p className="text-sm text-slate-300 leading-relaxed">
            {prob.hint ?? "Try to derive a simpler/brute-force solution and then optimize it."}
                        </p>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </Card>

            {/* Enhanced Test Results (in the bottom panel) */}
            {/* Run Output Panel */}
            {(showRunPanel || runOutput || runError) && (
              <Card className="glass-card p-6 overflow-visible">
                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <Play className="w-5 h-5 text-blue-400" />
                    <h3 className="text-lg font-semibold text-slate-100">Run Output</h3>
                  </div>
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="hot-pink mb-1 font-semibold flex items-center">
                        <span>Input</span>
                      </div>
                      <span className="text-[11px] text-slate-400">Enter to run • Shift+Enter for newline</span>
                    </div>
                    <div className="rounded-lg p-1">
                      <textarea
                        ref={runInputRef}
                        value={runInput}
                        onChange={(e) => { setRunInput(e.target.value); autoresizeRunInput(); }}
                        onInput={autoresizeRunInput}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' && !e.shiftKey) {
                            e.preventDefault();
                            runRaw(runInput);
                          }
                        }}
                        rows={1}
                        placeholder="Type input for input() calls"
                        className="w-full resize-none bg-transparent border-none px-2 py-1 text-sm text-slate-100 placeholder:text-slate-500 focus:outline-none"
                      />
                    </div>
                  </div>
                  {runOutput && (
                    <div className="space-y-1">
                      <div className="hot-pink mb-1 font-semibold flex items-center">
                        <span>Output</span>
                      </div>
                      <div className="font-mono text-white text-sm leading-snug whitespace-pre-wrap break-words px-0 py-0">
                        {runOutput || '\u00A0'}
                      </div>
                    </div>
                  )}
                  {runError && (
                    <div className="mt-2 space-y-1">
                      <div className="text-red-400 text-xs font-semibold mb-1">Error</div>
                      <div className="code-block text-xs p-2 bg-red-500/10 border border-red-500/30 rounded whitespace-pre-wrap break-words">
                        {runError}
                      </div>
                    </div>
                  )}
                </div>
              </Card>
            )}

            <Card className="glass-card p-8 overflow-visible">
              <div className="space-y-6">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <div className="w-3 h-3 bg-gradient-to-r from-blue-400 to-purple-400 rounded-full"></div>
                    <h3 className="text-xl font-semibold text-slate-100">
                      Test Results
                    </h3>
                  </div>
                  
                  {results && (
                    <div className="flex items-center space-x-4">
                      <div className="flex items-center space-x-2 text-sm text-slate-400">
                        <Timer className="w-4 h-4" />
                        <span>Runtime: 1.2s</span>
                      </div>
                      <div className="flex items-center space-x-2 text-sm text-slate-400">
                        <Target className="w-4 h-4" />
                        <span>Memory: 14.2 MB</span>
                      </div>
                    </div>
                  )}
                </div>

                {results ? (
                  <div className="space-y-6">
                    <div className="flex items-center justify-between p-4 bg-gradient-to-r from-slate-800/50 to-slate-700/50 rounded-xl">
                      <div className="text-lg font-semibold text-slate-200">
                        {results}
                      </div>
                      <div className="flex items-center space-x-2">
                        {testStatuses.filter(s => s === 1).length === testStatuses.length ? (
                          <div className="flex items-center space-x-2 text-emerald-400">
                            <Check className="w-5 h-5" />
                            <span className="font-medium">All tests passed!</span>
                          </div>
                        ) : (
                          <div className="flex items-center space-x-2 text-amber-400">
                            <X className="w-5 h-5" />
                            <span className="font-medium">Some tests failed</span>
                          </div>
                        )}
                      </div>
                    </div>
                    
          <div className="flex gap-4 w-full overflow-visible">
                      {(prob.examples ?? []).map((example, i) => {
                        const status = testStatuses[i] ?? 0;
                        const passed = status === 1;
                        const failed = status === 2;
                        return (
                          <Card
                            key={i}
                            className={`rounded-xl overflow-hidden min-h-[130px] flex-1 min-w-0 flex flex-col transition-none hover:shadow-none testcase-nohover ${
                              status === 0
                                ? 'bg-slate-900/50 border-slate-600/50 hover:border-slate-600/50'
                                : passed
                                ? 'testcase-pass'
                                : 'testcase-fail'
                            }`}
                          >
                            <div className={`px-3 py-1.5 border-b ${
                              passed ? 'border-emerald-500/30' : failed ? 'border-red-500/30' : 'border-slate-700/60'
                            }`}>
                              <span className="text-xs font-extrabold uppercase tracking-wide text-pink-500">
                                Test Case {i + 1}
                              </span>
                            </div>

                            <div className="p-3 space-y-2 flex-1">
                              <div>
                                <div className="text-sm font-extrabold hot-pink mb-0.5 uppercase tracking-wide flex items-center">
                                  <span>Input</span>
                                  <span className="relative inline-flex items-center">
                                    <button
                                      type="button"
                                      onClick={() => flashCopied(`tr-${i}-in`, example.input)}
                                      className="ml-0.5 p-0 bg-transparent hover:bg-transparent focus:bg-transparent border-none outline-none ring-0 rounded inline-flex items-center hot-pink opacity-90 hover:opacity-100"
                                      title="Copy input"
                                      aria-label={`Copy input for test case ${i + 1}`}
                                    >
                                      {copied[`tr-${i}-in`] ? (
                                        <Check className="w-1 h-1 hot-pink transform scale-50" />
                                      ) : (
                                        <Copy className="w-1 h-1 transform scale-50 hot-pink" />
                                      )}
                                    </button>
                                    {copied[`tr-${i}-in`] && (
                                      <span className="absolute -top-3 left-1/2 -translate-x-1/2 animate-scale-in">
                                        <Check className="w-2 h-2 hot-pink transform scale-50" />
                                      </span>
                                    )}
                                  </span>
                                </div>
                                <div className="font-mono text-white text-sm leading-snug whitespace-pre-wrap break-words">
                                  {example.input}
                                </div>
                              </div>

                              <div>
                                <div className="text-sm font-extrabold hot-pink mb-0.5 uppercase tracking-wide flex items-center">
                                  <span>{failed ? 'Expected Output' : 'Output'}</span>
                                  <span className="relative inline-flex items-center">
                                    <button
                                      type="button"
                                      onClick={() => flashCopied(`tr-${i}-out`, example.output)}
                                      className="ml-0.5 p-0 bg-transparent hover:bg-transparent focus:bg-transparent border-none outline-none ring-0 rounded inline-flex items-center hot-pink opacity-90 hover:opacity-100"
                                      title={failed ? 'Copy expected output' : 'Copy output'}
                                      aria-label={`Copy output for test case ${i + 1}`}
                                    >
                                      {copied[`tr-${i}-out`] ? (
                                        <Check className="w-1 h-1 hot-pink transform scale-50" />
                                      ) : (
                                        <Copy className="w-1 h-1 transform scale-50 hot-pink" />
                                      )}
                                    </button>
                                    {copied[`tr-${i}-out`] && (
                                      <span className="absolute -top-3 left-1/2 -translate-x-1/2 animate-scale-in">
                                        <Check className="w-2 h-2 hot-pink transform scale-50" />
                                      </span>
                                    )}
                                  </span>
                                </div>
                                <div className="font-mono text-white text-sm leading-snug whitespace-pre-wrap break-words">
                                  {example.output}
                                </div>
                              </div>

                              {failed && (
                                <div>
                                  <div className="text-sm font-extrabold text-red-400 mb-0.5 uppercase tracking-wide">
                                    Your Output
                                  </div>
                                  <div className="font-mono text-white text-sm leading-snug whitespace-pre-wrap break-words">
                                    {userOutputs[i] || ''}
                                  </div>
                                </div>
                              )}
                            </div>
                          </Card>
                        );
                      })}
                    </div>
                    
                    {testStatuses.filter(s => s === 1).length === testStatuses.length && (
                      <div className="text-center p-6 bg-gradient-to-r from-emerald-500/10 to-teal-500/10 rounded-xl border border-emerald-500/20">
                        <Trophy className="w-8 h-8 mx-auto text-emerald-400 mb-3" />
                        <h4 className="text-lg font-semibold text-emerald-300 mb-2">
                          Congratulations!
                        </h4>
                        <p className="text-slate-300">
                          All test cases passed. Ready to submit your solution?
                        </p>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="text-center py-12">
                    <div className="w-16 h-16 mx-auto mb-4 bg-gradient-to-r from-blue-500/20 to-purple-500/20 rounded-full flex items-center justify-center">
                      <Play className="w-8 h-8 text-blue-400" />
                    </div>
                    <h4 className="text-lg font-semibold text-slate-200 mb-2">
                      Ready to test your code?
                    </h4>
                    <p className="text-slate-400">
                      Click the &quot;Check&quot; button to execute your solution against the test cases.
                    </p>
                  </div>
                )}
              </div>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
