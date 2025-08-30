"use client";
import React, { useMemo, useState, useRef, useEffect } from "react";
import type { editor as MonacoEditorNS } from "monaco-editor";
import { Card } from "./ui/card";
import { Button } from "./ui/button";
import Editor from "@monaco-editor/react";
import Link from "next/link";
import Image from "next/image";
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
  LightbulbOff,
  Target,
  Copy
} from "lucide-react";
import { runPythonWithInput, canonicalizeInputSetup, outputsMatch } from "../lib/pyRunner";
import { upgradeStatus, setStatus } from "@/lib/status";
import { evaluateSubmission, type SubmissionResult } from "@/lib/submissionRunner";
// Submission results are now rendered inline in the Test Results panel

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
  // Ensure ALL lines are commented, even if a single constraint spans multiple lines.
  const constraintsLines = (prob.constraints ?? [])
    .flatMap((c) => String(c).split(/\r?\n/));
  const initialCode = `# Constraints:
${constraintsLines.map((line) => `# - ${line}`).join("\n")}
`;

  // Load code from localStorage if available
  const storageKey = prob?.id ? `cf-code-${prob.id}` : undefined;
  const [code, setCode] = useState(() => {
    if (typeof window !== "undefined" && storageKey) {
      const saved = localStorage.getItem(storageKey);
      if (saved && typeof saved === "string") return saved;
    }
    return initialCode;
  });
  const [showHint, setShowHint] = useState(false);
  const [hintEnabled, setHintEnabled] = useState(false);
  // Mirror of hintEnabled to avoid stale closures in Monaco callbacks
  const hintEnabledRef = useRef<boolean>(false);
  useEffect(() => { hintEnabledRef.current = hintEnabled; }, [hintEnabled]);
  const [showHintBanner, setShowHintBanner] = useState(true);
  const [running, setRunning] = useState(false);
  const [runningRaw, setRunningRaw] = useState(false);
  const [results, setResults] = useState<string | null>(null);
  const [testStatuses, setTestStatuses] = useState<number[]>([]);
  // Full-code hint after failed checks
  const [fullDesc, setFullDesc] = useState<string>("");
  const [fullFailure, setFullFailure] = useState<string>("");
  const [failedAnalyses, setFailedAnalyses] = useState<Array<{ index: number; explanation: string; categories: string[] }>>([]);
  const [studyResources, setStudyResources] = useState<{ youtube?: { title: string; url: string } | null; webpage?: { title: string; url: string } | null } | null>(null);
  const [nextSuggestion, setNextSuggestion] = useState<{ id?: string; name?: string; contestId?: number; index?: string } | null>(null);
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
  const editorContainerRef = useRef<HTMLDivElement | null>(null);
  const [editorHeight, setEditorHeight] = useState<string | number>('800px');
  // Hint glyph decorations: track decoration ids and AI hint text per id.
  const hintDecorationsRef = useRef<Array<{ id: string }>>([]);
  const hintTextByIdRef = useRef<Record<string, string>>({});
  const hintReportByIdRef = useRef<Record<string, any>>({});
  // Remember info about the last Enter keypress before the model changes
  const lastEnterInfoRef = useRef<{
    line: number;
    col: number;
    hadCode: boolean;
    hasCodeBefore: boolean;
  } | null>(null);
  
  // Submission state
  const [submissionResult, setSubmissionResult] = useState<SubmissionResult | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submissionError, setSubmissionError] = useState<string | null>(null);
  // Toggle which results panel is visible: 'check' or 'submission'
  const [activePanel, setActivePanel] = useState<'check' | 'submission'>('check');
  
  // Cleanup for wheel forwarding listener
  const wheelUnsubscribeRef = useRef<(() => void) | null>(null);
  // Protect the initial commented constraints from edits
  const protectedEndOffsetRef = useRef<number>(initialCode.length);
  const lastValidCodeRef = useRef<string>(initialCode);
  const isRevertingRef = useRef<boolean>(false);
  const hasMarkedTriedRef = useRef<boolean>(false);

  const flashCopied = (key: string, value: string) => {
    navigator.clipboard.writeText(value);
    setCopied((prev) => ({ ...prev, [key]: true }));
    setTimeout(() => {
      setCopied((prev) => ({ ...prev, [key]: false }));
    }, 900);
  };

  const runCode = async () => {
  // Switch to Check results panel when running sample tests
  setActivePanel('check');
    setRunning(true);
    setResults(null);
  setFullDesc("");
  setFullFailure("");
  setFailedAnalyses([]);
    const n = (prob.examples ?? []).length;
  // Use local arrays to avoid stale React state when building failure analysis
  const localStatuses: number[] = Array.from({ length: n }, () => 0);
  const localUserOutputs: string[] = Array.from({ length: n }, () => "");
  setTestStatuses(localStatuses.slice());
  setUserOutputs(localUserOutputs.slice());

    const examples = prob.examples ?? [];
    let passCount = 0;
    for (let i = 0; i < examples.length; i++) {
      const ex = examples[i];
      // Convert input example to Python assignments
      const inputSetup = canonicalizeInputSetup(ex.input || "");
      try {
        const res = await runPythonWithInput(lastValidCodeRef.current || code, inputSetup);
        if (res.exception) {
          const msg = `${res.exception}${res.stderr ? `\n${res.stderr}` : ''}`;
          localUserOutputs[i] = msg;
          localStatuses[i] = 2;
          setUserOutputs(localUserOutputs.slice());
          setTestStatuses(localStatuses.slice());
          continue;
        }
        const produced = (res.value ?? res.stdout ?? "").toString();
        const expected = ex.output ?? "";
        const ok = outputsMatch(expected, produced);
        localUserOutputs[i] = produced;
        localStatuses[i] = ok ? 1 : 2;
        setUserOutputs(localUserOutputs.slice());
        setTestStatuses(localStatuses.slice());
        if (ok) passCount++;
      } catch {
        localStatuses[i] = 2;
        localUserOutputs[i] = "Runtime error";
        setUserOutputs(localUserOutputs.slice());
        setTestStatuses(localStatuses.slice());
      }
    }

    const total = examples.length;
    const summary = total > 0 ? `${passCount}/${total} test cases passed` : "Ran 0 sample tests";
    setResults(summary);
    // If hints are enabled and tests failed, fetch a minimal full-code hint
    if (hintEnabledRef.current && total > 0 && passCount < total) {
      try {
        const res = await fetch('/api/hints/full', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            language: 'python',
            snippet: lastValidCodeRef.current || code,
            problem: { id: prob.id, name: prob.name, statement: prob.statement, tags: prob.tags },
          }),
        });
        if (res.ok) {
          const data = await res.json();
          setFullDesc((data?.description ?? '').toString());
          setFullFailure((data?.failure ?? '').toString());
        }
      } catch {}

      // New: also call failures analysis to explain failed test cases
      try {
        const failedCases = (prob.examples ?? [])
          .map((ex, i) => ({
            index: i,
            input: ex.input || '',
            expected: ex.output || '',
            userOutput: (localUserOutputs[i] ?? '').toString(),
            passed: (localStatuses[i] ?? 0) === 1,
          }))
          .filter(x => !x.passed)
          .map(({ index, input, expected, userOutput }) => ({ index, input, expected, userOutput }));

        if (failedCases.length) {
          const res2 = await fetch('/api/hints/failures', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              language: 'python',
              snippet: lastValidCodeRef.current || code,
              problem: { id: prob.id, name: prob.name, statement: prob.statement },
              failedCases,
            }),
          });
          if (res2.ok) {
            const data2 = await res2.json();
            const arr = Array.isArray(data2?.analyses) ? data2.analyses : [];
            setFailedAnalyses(arr);
            if (arr.length) {
              try {
                console.log('[Hints] Failures analysis prompt (system):', data2?.promptSystem || '(none)');
                console.log('[Hints] Failures analysis prompt (user):', data2?.promptUser || '(none)');
              } catch {}
            }
          }
        }
      } catch {}
    }
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

  // Save code to localStorage on change and resize editor
  useEffect(() => {
    if (typeof window !== "undefined" && storageKey) {
      try { localStorage.setItem(storageKey, code); } catch {}
    }
    // small timeout to wait for content updates
    const t = setTimeout(() => resizeEditorToContent(), 40);
    return () => clearTimeout(t);
  }, [code, storageKey]);

  // Cleanup any editor-bound listeners on unmount
  useEffect(() => {
    return () => {
      try { wheelUnsubscribeRef.current?.(); } catch {}
    };
  }, []);

  // Mark problem as viewed once loaded on client
  useEffect(() => {
    if (!prob?.id) return;
    try { upgradeStatus(prob.id, "viewed"); } catch {}
  }, [prob?.id]);

  // Debug: confirm ProblemEditor mounted
  useEffect(() => {
    try { console.debug('[Hints] ProblemEditor mounted'); } catch {}
  }, []);

  const submitCode = async () => {
    if (!prob?.id) {
      alert("No problem loaded. Please try again.");
      return;
    }
    
  // Show the submission panel immediately
  setActivePanel('submission');
    setIsSubmitting(true);
    setSubmissionError(null);
    setSubmissionResult(null);
    // Clear hint/failure state to avoid stale info carrying over from Check
    setFullDesc("");
    setFullFailure("");
    setFailedAnalyses([]);
    setStudyResources(null);
    setNextSuggestion(null);
    
    try {
      console.log('🚀 Starting submission for problem:', prob.id);
      console.log('📝 User code:', code);
      
      const result = await evaluateSubmission(prob.id, code, 10);
      setSubmissionResult(result);
      // Update overall problem status based on verdict
      try {
        setStatus(prob.id, result.accepted ? 'accepted' : 'rejected');
      } catch {}
      
      console.log('✅ Submission completed successfully');
      console.log('📊 Final result:', result.accepted ? 'ACCEPTED' : 'REJECTED');
      
      // Show a brief success message
      if (result.accepted) {
        console.log('🎉 Congratulations! Your solution was accepted!');
        // Suggest a similar problem using public dataset (best-effort)
        try {
          const bust = `?t=${Date.now()}`;
          const res = await fetch(`/data/problemset_complete.json${bust}`, { cache: 'no-store' });
          if (res.ok) {
            const arr = await res.json();
            const tags = (prob.tags || []).map(t => String(t).toLowerCase());
            const difficulty = prob.difficulty || ratingToDifficulty(prob.rating);
            const candidates = Array.isArray(arr) ? arr.filter((p: any) => {
              if (!p || p.name === prob.name) return false;
              const ptags: string[] = Array.isArray(p.tags) ? p.tags.map((x: any) => String(x).toLowerCase()) : [];
              const tagOverlap = tags.length ? ptags.some(t => tags.includes(t)) : true;
              const pdiff = String(p.difficulty || ratingToDifficulty(p.rating));
              const diffOk = difficulty ? (pdiff === difficulty) : true;
              return tagOverlap && diffOk;
            }) : [];
            const pick = candidates.length ? candidates[Math.floor(Math.random() * candidates.length)] : null;
            if (pick) setNextSuggestion({ id: pick.id || `${pick.contestId}/${pick.index}` || undefined, name: pick.name, contestId: pick.contestId, index: pick.index });
          }
        } catch {}
      } else {
        console.log('💪 Keep trying! Your solution needs some adjustments.');
        if (hintEnabledRef.current) {
          // 1) Analyze failed cases to extract categories first
          let categoriesForResources: string[] = [];
          try {
            const failedCases = (result.testCases || [])
              .map((tc, i) => ({ index: i, input: tc.input, expected: tc.expected, userOutput: tc.userOutput, passed: tc.passed }))
              .filter(x => !x.passed)
              .map(({ index, input, expected, userOutput }) => ({ index, input, expected, userOutput }));
            if (failedCases.length) {
              const res2 = await fetch('/api/hints/failures', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  language: 'python',
                  snippet: lastValidCodeRef.current || code,
                  problem: { id: prob.id, name: prob.name, statement: prob.statement },
                  failedCases,
                }),
              });
              if (res2.ok) {
                const data2 = await res2.json();
                const arr = Array.isArray(data2?.analyses) ? data2.analyses : [] as Array<{ index: number; explanation: string; categories: string[] }>;
                setFailedAnalyses(arr);
                const rawCats = arr.flatMap((a: any) => Array.isArray(a?.categories) ? a.categories.map((c: any) => String(c)) : []);
                categoriesForResources = Array.from(new Set(rawCats)) as string[];
                categoriesForResources = categoriesForResources.slice(0, 4);
                try {
                  if (data2?.promptSystem) console.log('[Hints] Failures analysis prompt (system):', data2.promptSystem);
                  if (data2?.promptUser) console.log('[Hints] Failures analysis prompt (user):', data2.promptUser);
                } catch {}
              }
            }
          } catch {}

          // 2) Fetch full-code summary with study resources driven by reason/categories
          try {
            const res = await fetch('/api/hints/full', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                language: 'python',
                snippet: lastValidCodeRef.current || code,
                problem: { id: prob.id, name: prob.name, statement: prob.statement, tags: prob.tags },
                includeResources: true,
                categories: categoriesForResources,
                reason: categoriesForResources[0] || undefined,
              }),
            });
            if (res.ok) {
              const data = await res.json();
              setFullDesc((data?.description ?? '').toString());
              setStudyResources(data?.resources || null);
              // If prompts are provided, log them for transparency
              try {
                if (data?.promptSystem) console.log('[Hints] Full prompt (system):', data.promptSystem);
                if (data?.promptUser) console.log('[Hints] Full prompt (user):', data.promptUser);
              } catch {}
            }
          } catch {}
        }
      }
      
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      setSubmissionError(errorMessage);
      console.error('❌ Submission failed:', error);
    } finally {
      setIsSubmitting(false);
    }
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

  // Clear hint glyphs when hints are disabled
  useEffect(() => {
    const ed = editorRef.current;
    if (!ed) return;
    if (!hintEnabled) {
      try {
        const oldIds = hintDecorationsRef.current.map((d) => d.id);
        if (oldIds.length) {
          ed.deltaDecorations(oldIds, []);
          hintDecorationsRef.current = [];
          hintTextByIdRef.current = {};
          hintReportByIdRef.current = {};
        }
      } catch {}
    }
  }, [hintEnabled]);

  return (
    <div className="min-h-screen bg-slate-950">
      {/* Navigation Header */}
      <header className="sticky top-0 z-50 border-b border-slate-800/50 glass-nav">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            {/* Logo & Navigation */}
            <div className="flex items-center space-x-8">
              <Link href="/" className="flex items-center space-x-3 group" title="Go to Home" aria-label="Go to Home">
                <div className="w-8 h-8 bg-gradient-to-r from-blue-500 to-purple-600 rounded-lg flex items-center justify-center">
                  <Code2 className="w-5 h-5 text-white" />
                </div>
                <span className="text-xl font-bold gradient-text group-hover:opacity-90">CodeSage</span>
              </Link>
              
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
              <Link href="/dashboard" className="w-8 h-8 bg-gradient-to-r from-blue-500 to-purple-600 rounded-full flex items-center justify-center" title="Open dashboard" aria-label="Open dashboard">
                <User className="w-4 h-4 text-white" />
              </Link>
            </div>
          </div>
        </div>
      </header>

      {/* Hints notice banner */}
      {showHintBanner && (
        <div className="fixed top-4 right-4 left-auto z-[9999] animate-slide-up hint-banner-fixed">
          <div className="px-3 py-2 rounded-2xl border border-blue-800 bg-blue-900 shadow-xl w-[10vw] min-w-[220px] hint-banner-card">
            <div className="flex items-start justify-between gap-2">
              <div className="flex items-start gap-2 text-slate-200 min-w-0">
                <LightbulbOff className="w-4 h-4 text-slate-300 shrink-0" />
                <span className="text-xs md:text-sm leading-snug break-words">Need help while coding? Press the Hint button to activate AI hints.</span>
              </div>
              <button
                type="button"
                onClick={() => setShowHintBanner(false)}
                aria-label="Close hints notice"
                className="p-1.5 rounded-md text-slate-300 bg-transparent hover:bg-transparent focus:bg-transparent border-none outline-none ring-0 focus:ring-0 focus:outline-none"
                title="Close"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      )}

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
                <div ref={editorContainerRef} className="relative">
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
                    glyphMargin: true,
                    scrollbar: { vertical: 'hidden', horizontal: 'hidden' },
                    scrollBeyondLastColumn: 0,
                    overviewRulerBorder: false,
                    overviewRulerLanes: 0,
                    lineDecorationsWidth: 30, // widened for glyph visibility
                    colorDecorators: true,
                    wordWrap: "on",
                    tabSize: 4,
                    insertSpaces: true,
                    automaticLayout: true,
                    renderWhitespace: 'none'
                  }}
                  onChange={(value) => setCode(value || "")}
                  onMount={(editor, monaco) => {
                    editorRef.current = editor;
                    try { console.debug('[Hints] Editor mounted'); } catch {}
                    // initial resize
                    setTimeout(resizeEditorToContent, 20);
                    editor.onDidContentSizeChange(() => {
                      resizeEditorToContent();
                    });
                    // Helper to build hover: prefer AI hint (if present); else show the line code; suppress if comment with empty value
                    const makeHover = (model: any, ln: number, decoId?: string) => {
                      const ai = decoId ? hintTextByIdRef.current[decoId] : undefined;
                      if (ai && ai.trim()) {
                        const safe = ai.replace(/```/g, '\\`\\`\\`');
                        return [{ value: safe }];
                      }
                      const raw = model?.getLineContent?.(ln) ?? '';
                      const m = raw.match(/^\s*#(.*)$/);
                      if (m) {
                        const inner = (m[1] || '').trim();
                        if (!inner) return null; // do not display when comment value is empty
                        const safe = inner.replace(/```/g, '\\`\\`\\`');
                        return [{ value: `\`\`\`python\n${safe}\n\`\`\`` }];
                      }
                      const safe = raw.replace(/```/g, '\\`\\`\\`');
                      return [{ value: `\`\`\`python\n${safe || ' '}\n\`\`\`` }];
                    };

                    // Fetch an AI hint for a given line; store by decoration id and refresh hover
                    const fetchAiHint = async (decoId: string, lineNumber: number) => {
                      try {
                        const model = editor.getModel?.();
                        if (!model) return;
                        const lineText = model.getLineContent(lineNumber) || '';
                        const totalLines = model.getLineCount();
                        const start = Math.max(1, lineNumber - 7);
                        const end = Math.min(totalLines, lineNumber + 7);
                        const snippet: string = Array.from({ length: end - start + 1 }, (_, i) => start + i)
                          .map((ln) => model.getLineContent(ln))
                          .join("\n");
                        const res = await fetch('/api/hints', {
                          method: 'POST',
                          headers: { 'Content-Type': 'application/json' },
                          body: JSON.stringify({
                            language: 'python',
                            lineNumber,
                            lineText,
                            snippet,
                            problem: { id: prob.id, name: prob.name, statement: prob.statement },
                          }),
                        });
                        if (!res.ok) return;
                        const data = await res.json();
                        const needHint: boolean = !!data?.needHint;
                        const classes: string[] = Array.isArray(data?.errorClasses) ? data.errorClasses : [];
                        const hint: string = (data?.hint ?? '').toString();
                        const report = data?.report ?? null;
                        // Log the exact prompt used when a hint is produced
                        if (needHint && hint) {
                          try {
                            console.log('[Hints] Prompt (system) used for this line:', data?.promptSystem || '(none)');
                            console.log('[Hints] Prompt (user) used for this line:', data?.promptUser || '(none)');
                          } catch {}
                        }
                        if (!needHint || !classes.length) {
                          // Remove this decoration entirely; no hint needed
                          const oldIds = hintDecorationsRef.current.map((d) => d.id);
                          const mdl = editor.getModel?.();
                          if (!mdl) return;
                          const rebuilt = hintDecorationsRef.current
                            .filter((d) => d.id !== decoId)
                            .map((d) => {
                              const r = mdl.getDecorationRange?.(d.id);
                              if (!r) return null;
                              const hover = makeHover(mdl, r.startLineNumber, d.id);
                              return {
                                __oldId: d.id,
                                range: { startLineNumber: r.startLineNumber, startColumn: 1, endLineNumber: r.startLineNumber, endColumn: 1 },
                                options: {
                                  isWholeLine: true,
                                  glyphMarginClassName: 'codicon codicon-comment hint-glyph',
                                  glyphMarginHoverMessage: (hover as any) ?? undefined,
                                } as any,
                              };
                            })
                            .filter(Boolean) as any[];
                          const newIds = editor.deltaDecorations(oldIds, rebuilt);
                          const newMap: Record<string, string> = {};
                          const newReportMap: Record<string, any> = {};
                          for (let i = 0; i < rebuilt.length; i++) {
                            const oldId = (rebuilt[i] as any).__oldId as string;
                            const nid = newIds[i];
                            const txt = hintTextByIdRef.current[oldId];
                            if (txt !== undefined) newMap[nid] = txt;
                            const rep = hintReportByIdRef.current[oldId];
                            if (rep !== undefined) newReportMap[nid] = rep;
                          }
                          hintDecorationsRef.current = newIds.map((id: string) => ({ id }));
                          hintTextByIdRef.current = newMap;
                          hintReportByIdRef.current = newReportMap;
                          return;
                        }
                        // Store and refresh
                        hintTextByIdRef.current[decoId] = hint;
                        hintReportByIdRef.current[decoId] = report;
                        const oldIds = hintDecorationsRef.current.map((d) => d.id);
                        const mdl = editor.getModel?.();
                        if (!mdl) return;
                        const rebuilt = hintDecorationsRef.current
                          .map((d) => {
                            const r = mdl.getDecorationRange?.(d.id);
                            if (!r) return null;
                            const hv = makeHover(mdl, r.startLineNumber, d.id);
                            return {
                              __oldId: d.id,
                              range: { startLineNumber: r.startLineNumber, startColumn: 1, endLineNumber: r.startLineNumber, endColumn: 1 },
                              options: {
                                isWholeLine: true,
                                glyphMarginClassName: 'codicon codicon-comment hint-glyph',
                                glyphMarginHoverMessage: (hv as any) ?? undefined,
                              } as any,
                            };
                          })
                          .filter(Boolean) as any[];
                        const newIds = editor.deltaDecorations(oldIds, rebuilt);
                        const newMap: Record<string, string> = {};
                        const newReportMap: Record<string, any> = {};
                        for (let i = 0; i < rebuilt.length; i++) {
                          const oldId = (rebuilt[i] as any).__oldId as string;
                          const nid = newIds[i];
                          const txt = hintTextByIdRef.current[oldId];
                          if (txt !== undefined) newMap[nid] = txt;
                          const rep = hintReportByIdRef.current[oldId];
                          if (rep !== undefined) newReportMap[nid] = rep;
                        }
                        hintDecorationsRef.current = newIds.map((id: string) => ({ id }));
                        hintTextByIdRef.current = { ...hintTextByIdRef.current, ...newMap };
                        hintReportByIdRef.current = { ...hintReportByIdRef.current, ...newReportMap };
                      } catch {}
                    };

                    // Decide first via API; only add a glyph if a hint is actually needed
                    const decideAndMaybeAddHintAtLine = async (line: number) => {
                      if (!hintEnabledRef.current) return;
                      const model = editor.getModel?.();
                      if (!model) return;
                      const maxLine = model.getLineCount();
                      const lineNum = Math.max(1, Math.min(line, maxLine));
                      // Find all existing decorations pinned to this line
                      const entriesOnLine = hintDecorationsRef.current.filter((d) => {
                        const r = model.getDecorationRange?.(d.id);
                        return r?.startLineNumber === lineNum;
                      });

                      // Build context for decision
                      const lineText = model.getLineContent(lineNum) || '';
                      const trimmed = lineText.trim();
                      // Skip empty or comment-only lines locally and remove any stale glyph
                      if (!trimmed || /^#/.test(trimmed)) {
            if (entriesOnLine.length) {
                          const oldIds = hintDecorationsRef.current.map((d) => d.id);
                          const mdl = editor.getModel?.();
                          if (!mdl) return;
                          const rebuilt = hintDecorationsRef.current
              .filter((d) => !entriesOnLine.some((x) => x.id === d.id))
                            .map((d) => {
                              const r = mdl.getDecorationRange?.(d.id);
                              if (!r) return null;
                              const hover = makeHover(mdl, r.startLineNumber, d.id);
                              return {
                                __oldId: d.id,
                                range: { startLineNumber: r.startLineNumber, startColumn: 1, endLineNumber: r.startLineNumber, endColumn: 1 },
                                options: {
                                  isWholeLine: true,
                                  glyphMarginClassName: 'codicon codicon-comment hint-glyph',
                                  glyphMarginHoverMessage: (hover as any) ?? undefined,
                                } as any,
                              };
                            })
                            .filter(Boolean) as any[];
                          const newIds = editor.deltaDecorations(oldIds, rebuilt);
                          const newMap: Record<string, string> = {};
                          const newReportMap: Record<string, any> = {};
                          for (let i = 0; i < rebuilt.length; i++) {
                            const oldId = (rebuilt[i] as any).__oldId as string;
                            const nid = newIds[i];
                            const txt = hintTextByIdRef.current[oldId];
                            if (txt !== undefined) newMap[nid] = txt;
                            const rep = hintReportByIdRef.current[oldId];
                            if (rep !== undefined) newReportMap[nid] = rep;
                          }
                          hintDecorationsRef.current = newIds.map((id: string) => ({ id }));
                          hintTextByIdRef.current = newMap;
                          hintReportByIdRef.current = newReportMap;
                        }
                        return;
                      }
                      const snippet: string = model.getValue(); // full user code for global context

                      try {
                        const res = await fetch('/api/hints', {
                          method: 'POST',
                          headers: { 'Content-Type': 'application/json' },
                          body: JSON.stringify({
                            language: 'python',
                            lineNumber: lineNum,
                            lineText,
                            snippet,
                            problem: { id: prob.id, name: prob.name, statement: prob.statement },
                          }),
                        });
                        if (!res.ok) return;
                        const data = await res.json();
                        const needHint: boolean = !!data?.needHint;
                        const classes: string[] = Array.isArray(data?.errorClasses) ? data.errorClasses : [];
                        const hint: string = (data?.hint ?? '').toString();
                        const report = data?.report ?? null;
                        // Log the exact prompt used when a hint is produced
                        if (needHint && hint) {
                          try {
                            console.log('[Hints] Prompt (system) used for this line:', data?.promptSystem || '(none)');
                            console.log('[Hints] Prompt (user) used for this line:', data?.promptUser || '(none)');
                          } catch {}
                        }

                        const oldIds = hintDecorationsRef.current.map((d) => d.id);
                        const modelRanges = hintDecorationsRef.current
                          .map((d) => ({ id: d.id, r: model.getDecorationRange?.(d.id) }))
                          .filter((x) => !!x.r);

                        if (!needHint || !classes.length) {
                          // Remove any and all decorations on this line
                          if (entriesOnLine.length) {
                            const idsOnLine = new Set(entriesOnLine.map((e) => e.id));
                            const rebuilt = modelRanges
                              .filter(({ id }) => !idsOnLine.has(id))
                              .map(({ id, r }) => {
                                const hover = makeHover(model, r!.startLineNumber, id);
                                return {
                                  __oldId: id,
                                  range: { startLineNumber: r!.startLineNumber, startColumn: 1, endLineNumber: r!.startLineNumber, endColumn: 1 },
                                  options: {
                                    isWholeLine: true,
                                    glyphMarginClassName: 'codicon codicon-comment hint-glyph',
                                    glyphMarginHoverMessage: (hover as any) ?? undefined,
                                  } as any,
                                };
                              });
                            const newIds = editor.deltaDecorations(oldIds, rebuilt as any);
                            const newMap: Record<string, string> = {};
                            const newReportMap: Record<string, any> = {};
                            for (let i = 0; i < rebuilt.length; i++) {
                              const oldId = (rebuilt[i] as any).__oldId as string;
                              const nid = newIds[i];
                              const txt = hintTextByIdRef.current[oldId];
                              if (txt !== undefined) newMap[nid] = txt;
                              const rep = hintReportByIdRef.current[oldId];
                              if (rep !== undefined) newReportMap[nid] = rep;
                            }
                            hintDecorationsRef.current = newIds.map((id: string) => ({ id }));
                            hintTextByIdRef.current = newMap;
                            hintReportByIdRef.current = newReportMap;
                          }
                          return;
                        }

                        // needHint = true with valid classes. Ensure at most one decoration on this line
                        const safe = hint.replace(/```/g, '\\`\\`\\`');
                        if (entriesOnLine.length) {
                          const keepId = entriesOnLine[0].id; // keep the first, drop others
                          const idsToDrop = new Set(entriesOnLine.slice(1).map((e) => e.id));
                          // Update existing hint text, then rebuild to refresh hover
                          hintTextByIdRef.current[keepId] = hint;
                          hintReportByIdRef.current[keepId] = report;
                          const rebuilt = modelRanges
                            .filter(({ id }) => !idsToDrop.has(id))
                            .map(({ id, r }) => {
                            const hv = makeHover(model, r!.startLineNumber, id);
                            return {
                              __oldId: id,
                              range: { startLineNumber: r!.startLineNumber, startColumn: 1, endLineNumber: r!.startLineNumber, endColumn: 1 },
                              options: {
                                isWholeLine: true,
                                glyphMarginClassName: 'codicon codicon-comment hint-glyph',
                                glyphMarginHoverMessage: (hv as any) ?? undefined,
                              } as any,
                            };
                          });
                          const newIds = editor.deltaDecorations(oldIds, rebuilt as any);
                          const newMap: Record<string, string> = {};
                          const newReportMap: Record<string, any> = {};
                          for (let i = 0; i < rebuilt.length; i++) {
                            const oldId = (rebuilt[i] as any).__oldId as string;
                            const nid = newIds[i];
                            const txt = hintTextByIdRef.current[oldId];
                            if (txt !== undefined) newMap[nid] = txt;
                            const rep = hintReportByIdRef.current[oldId];
                            if (rep !== undefined) newReportMap[nid] = rep;
                          }
                          hintDecorationsRef.current = newIds.map((id: string) => ({ id }));
                          hintTextByIdRef.current = newMap;
                          hintReportByIdRef.current = newReportMap;
                        } else {
                          // Add new decoration on this line with hint
                          const existingRanges = modelRanges.map(({ id, r }) => {
                            const hover = makeHover(model, r!.startLineNumber, id);
                            return {
                              __oldId: id,
                              range: { startLineNumber: r!.startLineNumber, startColumn: 1, endLineNumber: r!.startLineNumber, endColumn: 1 },
                              options: {
                                isWholeLine: true,
                                glyphMarginClassName: 'codicon codicon-comment hint-glyph',
                                glyphMarginHoverMessage: (hover as any) ?? undefined,
                              } as any,
                            };
                          });
                          const newRange = {
                            range: { startLineNumber: lineNum, startColumn: 1, endLineNumber: lineNum, endColumn: 1 },
                            options: {
                              isWholeLine: true,
                              glyphMarginClassName: 'codicon codicon-comment hint-glyph',
                              glyphMarginHoverMessage: [{ value: safe }] as any,
                            } as any,
                          };
                          const allNew = [...existingRanges, newRange] as any;
                          const newIds = editor.deltaDecorations(oldIds, allNew);
                          // Remap stored data for existing decos and add mapping for the created deco
                          const newMap: Record<string, string> = {};
                          const newReportMap: Record<string, any> = {};
                          for (let i = 0; i < existingRanges.length; i++) {
                            const oldId = (existingRanges[i] as any).__oldId as string;
                            const newId = newIds[i];
                            if (oldId && newId) {
                              const txt = hintTextByIdRef.current[oldId];
                              if (txt !== undefined) newMap[newId] = txt;
                              const rep = hintReportByIdRef.current[oldId];
                              if (rep !== undefined) newReportMap[newId] = rep;
                            }
                          }
                          const createdId = newIds[newIds.length - 1];
                          hintDecorationsRef.current = newIds.map((id: string) => ({ id }));
                          hintTextByIdRef.current = { ...newMap, [createdId]: hint };
                          hintReportByIdRef.current = { ...newReportMap, [createdId]: report };
                        }
                      } catch {}
                    };

                    // Re-evaluate all current hint lines to remove/update stale ones
                    const recheckAllHintDecorations = async (excludeLine?: number) => {
                      if (!hintEnabledRef.current) return;
                      const model = editor.getModel?.();
                      if (!model) return;
                      const items = hintDecorationsRef.current
                        .map((d) => ({ id: d.id, r: model.getDecorationRange?.(d.id) }))
                        .filter((x) => !!x.r) as { id: string; r: any }[];
                      // Snapshot target lines first to avoid issues while decorations remap
                      const targetLines = items
                        .map(({ r }) => r.startLineNumber)
                        .filter((ln) => (excludeLine ? ln !== excludeLine : true));
                      for (const ln of targetLines) {
                        await decideAndMaybeAddHintAtLine(ln);
                      }
                    };
                    // Keep a snapshot of valid code (used when reverting illegal edits)
                    try {
                      lastValidCodeRef.current = editor.getValue();
                      protectedEndOffsetRef.current = initialCode.length;
                    } catch {}

                    // Block edits inside the protected constraints header
                    try {
                      // addHintDecorationAtLine defined above

                      // Pre-capture Enter: line, column, whether line has code, and whether code exists before the cursor
                      editor.onKeyDown((e: any) => {
                        const key = e?.browserEvent?.key;
                        if (key !== 'Enter') return;
                        const model = editor.getModel?.();
                        if (!model) return;
                        const pos = editor.getPosition?.();
                        if (!pos) return;
                        const lineContent = model.getLineContent(pos.lineNumber) ?? '';
                        const left = lineContent.slice(0, Math.max(0, (pos.column || 1) - 1));
                        const right = lineContent.slice(Math.max(0, (pos.column || 1) - 1));
                        const hasCode = /\S/.test(lineContent); // any non-whitespace on the line
                        const hasCodeBefore = /\S/.test(left);
                        lastEnterInfoRef.current = { line: pos.lineNumber, col: pos.column || 1, hadCode: hasCode, hasCodeBefore };
                        try { console.debug('[Hints] Enter pre-capture at line', pos.lineNumber, 'hadCode=', hasCode); } catch {}
                      });

                       editor.onDidChangeModelContent((ev: { changes?: Array<{ rangeOffset: number; text?: string }> }) => {
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

                        // First valid user edit beyond protected header -> mark as tried
                        if (!hasMarkedTriedRef.current) {
                          const anyAfterProtected = (ev?.changes ?? []).some((ch) => ch.rangeOffset >= protectedEnd);
                          if (anyAfterProtected && prob?.id) {
                            try { upgradeStatus(prob.id, "tried"); } catch {}
                            hasMarkedTriedRef.current = true;
                          }
                        }

                        // Immediate hint glyph on newline insertion when hints are enabled
                        const chWithNl = (ev?.changes ?? []).find((ch) => /\r?\n/.test((ch as any).text ?? '')) as
                          | { rangeOffset: number; text?: string }
                          | undefined;
                          if (chWithNl) {
                          try { console.debug('[Hints] Newline detected (global)'); } catch {}
                          // Use the pre-captured Enter info to decide placement and skipping
                          const info = lastEnterInfoRef.current;
                          lastEnterInfoRef.current = null; // consume
                          if (!hintEnabledRef.current || !info) return;
                          if (!info.hadCode) {
                            try { console.debug('[Hints] Skipping glyph for empty-line Enter at line', info.line); } catch {}
                            return;
                          }
                          const protectedEndPos = model.getPositionAt?.(protectedEnd);
                          if (protectedEndPos && info.line < protectedEndPos.lineNumber) {
                            // Enter within protected region: allow fallback handler to manage
                            return;
                          }
                          // Determine which line now owns the code after Enter
                          // If there was code before the cursor, the original line keeps code; otherwise code moved to the next line
                          const targetLine = info.hasCodeBefore ? info.line : info.line + 1;

                          // STRICT line-based behavior: clear any previously displayed hint decorations
                          // so only the new line's hint (if any) remains displayed.
                          if (hintDecorationsRef.current.length) {
                            const oldIds = hintDecorationsRef.current.map(d => d.id);
                            editor.deltaDecorations(oldIds, []);
                            hintDecorationsRef.current = [];
                            hintTextByIdRef.current = {};
                            hintReportByIdRef.current = {};
                          }
                          // Decide first, then add glyph only if needed
                          decideAndMaybeAddHintAtLine(targetLine);
                          // Do not recheck other lines here; we want hints to be strictly tied to the current Enter line
                        }

          // Refresh hover messages for all current decorations to reflect live line text or AI hints
                          if (hintDecorationsRef.current.length) {
                            const oldIds = hintDecorationsRef.current.map((d) => d.id);
                            const refreshed = hintDecorationsRef.current
                              .map((d) => ({ id: d.id, r: model.getDecorationRange?.(d.id) }))
                              .filter((x) => !!x.r)
                              .map(({ id, r }) => {
                                const hover = makeHover(model, r!.startLineNumber, id);
                                return {
                                  __oldId: id,
                                  range: {
                                    startLineNumber: r!.startLineNumber,
                                    startColumn: 1,
                                    endLineNumber: r!.startLineNumber,
                                    endColumn: 1,
                                  },
                                  options: {
                                    isWholeLine: true,
                                    glyphMarginClassName: 'codicon codicon-comment hint-glyph',
                                    glyphMarginHoverMessage: (hover as any) ?? undefined,
                                  } as any,
                                };
                              });
                            const newIds = editor.deltaDecorations(oldIds, refreshed as any);
                            // Remap AI hints to the corresponding new ids
                            const newMap: Record<string, string> = {};
                            for (let i = 0; i < refreshed.length; i++) {
                              const oldId = (refreshed[i] as any).__oldId as string;
                              const newId = newIds[i];
                              const txt = hintTextByIdRef.current[oldId];
                              if (txt !== undefined) newMap[newId] = txt;
                            }
                            hintDecorationsRef.current = newIds.map((id: string) => ({ id }));
                            hintTextByIdRef.current = newMap;
                          }
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

      // Fallback: if Enter is pressed inside protected header, add glyph if the line had code
                        try {
                          editor.onKeyDown((e: any) => {
                            const key = e?.browserEvent?.key;
                            if (!hintEnabledRef.current) return;
                            if (key === 'Enter') {
                              const pos = editor.getPosition?.();
                              const model2 = editor.getModel?.();
                              if (!pos || !model2) return;
                              const protectedEndPos = model2.getPositionAt?.(protectedEndOffsetRef.current ?? 0);
                              if (protectedEndPos && pos.lineNumber < protectedEndPos.lineNumber) {
        const lineContent = model2.getLineContent(pos.lineNumber) ?? '';
        const left = lineContent.slice(0, Math.max(0, (pos.column || 1) - 1));
        const hasCode = /\S/.test(lineContent);
        const hasCodeBefore = /\S/.test(left);
        try { console.debug('[Hints] Enter in protected region at line', pos.lineNumber, 'hadCode=', hasCode, 'hasCodeBefore=', hasCodeBefore); } catch {}
                            if (hasCode) {
          // Clear previous hints to keep behavior strictly line-based per Enter
          if (hintDecorationsRef.current.length) {
            const oldIds = hintDecorationsRef.current.map(d => d.id);
            editor.deltaDecorations(oldIds, []);
            hintDecorationsRef.current = [];
            hintTextByIdRef.current = {};
            hintReportByIdRef.current = {};
          }
          if (hasCodeBefore) {
            decideAndMaybeAddHintAtLine(pos.lineNumber);
          } else {
            // Code moved to next line; only add if next line is not inside protected header
            if (pos.lineNumber + 1 >= protectedEndPos.lineNumber) {
              decideAndMaybeAddHintAtLine(pos.lineNumber + 1);
            }
          }
        }
                              }
                            }
                          });
                        } catch {}

                        // No click popup behavior; hover hint is provided via glyphMarginHoverMessage

                        // Store unsubscribe for wheel
                        wheelUnsubscribeRef.current = () => domNode.removeEventListener('wheel', wheelHandler);
                      }
                    } catch {
                      // ignore
                    }
                  }}
                />
                </div>
              </div>

              {/* Editor Action Buttons */}
              <div className="px-6 py-5 bg-gradient-to-r from-slate-800/30 to-slate-700/30 border-t border-slate-700/50">
                <div className="flex items-center justify-between gap-4 flex-wrap">
                  <div className="flex items-center gap-3 flex-wrap">
                    <Button
                      variant="hint"
                      onClick={() => {
                        if (!hintEnabled) {
                          try { console.debug('[Hints] Enabling hints'); } catch {}
                          setHintEnabled(true);
                          setShowHint(true);
                        } else {
                          setShowHint(v => !v);
                        }
                      }}
                      className="rounded-full px-5 py-2.5 text-sm md:text-base backdrop-blur-md transition-all btn-hint"
                      title={!hintEnabled ? 'Enable hints' : (showHint ? 'Hide hint' : 'Show hint')}
                      aria-label={!hintEnabled ? 'Enable hints' : (showHint ? 'Hide hint' : 'Show hint')}
                    >
                      {hintEnabled ? (
                        <Lightbulb className="w-4 h-4 md:w-5 md:h-5 mr-2 text-yellow-300" />
                      ) : (
                        <LightbulbOff className="w-4 h-4 md:w-5 md:h-5 mr-2 text-slate-400" />
                      )}
                      {!hintEnabled ? 'Enable Hints' : (showHint ? 'Hide Hint' : 'Show Hint')}
                    </Button>

          {hintEnabled && (
                      <Button
            variant="secondary"
                        onClick={() => { try { console.debug('[Hints] Disabling hints'); } catch {}; setHintEnabled(false); setShowHint(false); }}
            className="rounded-full px-4 py-2.5 text-sm md:text-base backdrop-blur-md transition-all btn-deactivate"
                        title="Deactivate hints"
                        aria-label="Deactivate hints"
                      >
                        <LightbulbOff className="w-4 h-4 md:w-5 md:h-5 mr-2" />
                        Deactivate
                      </Button>
                    )}

                    <Button
                      variant="run"
                      onClick={onClickRun}
                      disabled={runningRaw}
                      className={`rounded-full px-6 py-2.5 text-sm md:text-base backdrop-blur-md transition-all btn-run ${runningRaw ? 'opacity-70 cursor-not-allowed' : ''}`}
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
                      disabled={isSubmitting}
                      className={`rounded-full px-6 py-2.5 text-sm md:text-base backdrop-blur-md transition-all btn-submit ${isSubmitting ? 'opacity-70 cursor-not-allowed' : ''}`}
                      onClick={submitCode}
                      title="Submit your solution"
                      aria-label="Submit solution"
                    >
                      {isSubmitting ? (
                        <>
                          <Loader2 className="w-4 h-4 md:w-5 md:h-5 mr-2 animate-spin" />
                          Submitting...
                        </>
                      ) : (
                        <>
                          <Send className="w-4 h-4 md:w-5 md:h-5 mr-2" />
                          Submit
                        </>
                      )}
                    </Button>
                  </div>
                </div>

        {/* Hint/summary box: show code logic and also suggest next problem when available */}
  {(hintEnabled && (fullDesc || studyResources || failedAnalyses.length)) || (submissionResult?.accepted && nextSuggestion) ? (
          <div className="mt-4 p-4 bg-gradient-to-r from-yellow-500/10 to-amber-500/10 border border-yellow-500/20 rounded-xl animate-slide-up">
            <div className="flex items-start space-x-3">
              <Lightbulb className="w-5 h-5 text-yellow-400 mt-0.5 flex-shrink-0" />
              <div className="w-full">
    <h4 className="text-sm font-semibold text-yellow-300 mb-2">Your code logic</h4>
    {fullDesc && (<p className="text-sm text-slate-300 leading-relaxed">{fullDesc}</p>)}
    {studyResources && (studyResources.youtube || studyResources.webpage) && (
      <div className="mt-3 space-y-1">
        <div className="text-xs text-slate-300"><span className="font-semibold">Study material:</span></div>
        {studyResources.youtube && studyResources.youtube.url && (
          <div className="text-xs">
            <span className="text-slate-400">YouTube:</span> <a className="text-blue-300 underline" href={studyResources.youtube.url} target="_blank" rel="noreferrer">{studyResources.youtube.title || studyResources.youtube.url}</a>
          </div>
        )}
        {studyResources.webpage && studyResources.webpage.url && (
          <div className="text-xs">
            <span className="text-slate-400">Webpage:</span> <a className="text-blue-300 underline" href={studyResources.webpage.url} target="_blank" rel="noreferrer">{studyResources.webpage.title || studyResources.webpage.url}</a>
          </div>
        )}
      </div>
    )}
    {nextSuggestion && submissionResult?.accepted && (
      <div className="mt-3 text-xs text-slate-300">
        <span className="font-semibold">Next similar problem:</span>{' '}
        {nextSuggestion.contestId && nextSuggestion.index ? (
          <Link className="text-blue-300 underline" href={`/problems/${nextSuggestion.contestId}/${nextSuggestion.index}`} target="_blank" rel="noreferrer">
            {nextSuggestion.name || `${nextSuggestion.contestId}/${nextSuggestion.index}`}
          </Link>
        ) : (
          <span>{nextSuggestion.name}</span>
        )}
      </div>
    )}
              </div>
            </div>
          </div>
        ) : null}
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
              {/* Switch panel based on explicit state so Check works after Submit */}
              {activePanel === 'submission' ? (
                <div className="space-y-8">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <div className="w-3 h-3 bg-gradient-to-r from-blue-400 to-purple-400 rounded-full"></div>
                      <h3 className="text-xl font-semibold text-slate-100">Submission Results</h3>
                    </div>
                  </div>

                  {/* Loading state */}
                  {isSubmitting && (
                    <div className="flex flex-col items-center justify-center py-16">
                      <Loader2 className="w-10 h-10 text-blue-400 animate-spin mb-4" />
                      <div className="text-slate-300 text-lg">Running submission tests...</div>
                    </div>
                  )}

                  {/* Error state */}
                  {submissionError && !isSubmitting && (
                    <div className="p-4 border border-red-500/30 rounded-xl bg-red-500/10 text-center">
                      <div className="text-red-300 font-semibold">Submission Error</div>
                      <div className="text-red-400 text-sm mt-1">{submissionError}</div>
                    </div>
                  )}

                  {/* Accepted/Rejected */}
                  {submissionResult && !isSubmitting && (
                    <div className="space-y-8">
                      <div className="flex items-center justify-center gap-3 text-center">
                        <Image
                          src={submissionResult.accepted ? "/accepted.png" : "/rejected.png"}
                          alt={submissionResult.accepted ? "Accepted" : "Rejected"}
                          width={80}
                          height={80}
                          className="w-5 h-5 object-contain loop-bounce"
                          priority
                        />
                      </div>

                      {/* Rejected: show only failed samples in a red-bordered table */}
                      {!submissionResult.accepted && (
                        <div className="space-y-4">
                          <div className="flex gap-4 w-full overflow-visible">
                            {submissionResult.testCases
                              .map((tc, originalIdx) => ({ tc, originalIdx }))
                              .filter(({ tc }) => !tc.passed)
                              .map(({ tc, originalIdx }) => (
                                <Card
                                  key={originalIdx}
                                  className={`rounded-xl overflow-hidden min-h-[130px] flex-1 min-w-0 flex flex-col transition-none hover:shadow-none testcase-nohover testcase-fail`}
                                >
                                  <div className={`px-3 py-1.5 border-b border-red-500/30`}>
                                    <span className="text-xs font-extrabold uppercase tracking-wide text-pink-500">
                                      Test Case {originalIdx + 1}
                                    </span>
                                  </div>
                                  <div className="p-3 space-y-2 flex-1">
                                    <div>
                                      <div className="text-sm font-extrabold hot-pink mb-0.5 uppercase tracking-wide flex items-center">
                                        <span>Input</span>
                                        <span className="relative inline-flex items-center">
                                          <button
                                            type="button"
                                            onClick={() => flashCopied(`sub-${originalIdx}-in`, tc.input)}
                                            className="ml-0.5 p-0 bg-transparent hover:bg-transparent focus:bg-transparent border-none outline-none ring-0 rounded inline-flex items-center hot-pink opacity-90 hover:opacity-100"
                                            title="Copy input"
                                            aria-label={`Copy input for test case ${originalIdx + 1}`}
                                          >
                                            {copied[`sub-${originalIdx}-in`] ? (
                                              <Check className="w-1 h-1 hot-pink transform scale-50" />
                                            ) : (
                                              <Copy className="w-1 h-1 transform scale-50 hot-pink" />
                                            )}
                                          </button>
                                          {copied[`sub-${originalIdx}-in`] && (
                                            <span className="absolute -top-3 left-1/2 -translate-x-1/2 animate-scale-in">
                                              <Check className="w-2 h-2 hot-pink transform scale-50" />
                                            </span>
                                          )}
                                        </span>
                                      </div>
                                      <div className="font-mono text-white text-sm leading-snug whitespace-pre-wrap break-words">{tc.input}</div>
                                    </div>

                                    <div>
                                      <div className="text-sm font-extrabold hot-pink mb-0.5 uppercase tracking-wide flex items-center">
                                        <span>Expected Output</span>
                                        <span className="relative inline-flex items-center">
                                          <button
                                            type="button"
                                            onClick={() => flashCopied(`sub-${originalIdx}-out`, tc.expected)}
                                            className="ml-0.5 p-0 bg-transparent hover:bg-transparent focus:bg-transparent border-none outline-none ring-0 rounded inline-flex items-center hot-pink opacity-90 hover:opacity-100"
                                            title="Copy expected output"
                                            aria-label={`Copy expected output for test case ${originalIdx + 1}`}
                                          >
                                            {copied[`sub-${originalIdx}-out`] ? (
                                              <Check className="w-1 h-1 hot-pink transform scale-50" />
                                            ) : (
                                              <Copy className="w-1 h-1 transform scale-50 hot-pink" />
                                            )}
                                          </button>
                                          {copied[`sub-${originalIdx}-out`] && (
                                            <span className="absolute -top-3 left-1/2 -translate-x-1/2 animate-scale-in">
                                              <Check className="w-2 h-2 hot-pink transform scale-50" />
                                            </span>
                                          )}
                                        </span>
                                      </div>
                                      <div className="font-mono text-white text-sm leading-snug whitespace-pre-wrap break-words">{tc.expected}</div>
                                    </div>

                                    <div>
                                      <div className="text-sm font-extrabold text-red-400 mb-0.5 uppercase tracking-wide">Your Output</div>
                                      <div className="font-mono text-white text-sm leading-snug whitespace-pre-wrap break-words">{tc.userOutput}</div>
                                      {failedAnalyses.find(a => a.index === originalIdx) && (
                                        <div className="mt-2 p-2 rounded border border-amber-500/30 bg-amber-500/10">
                                          <div className="text-amber-300 text-xs font-semibold mb-1">Why test case {originalIdx + 1} failed:</div>
                                          <div className="text-amber-200 text-xs whitespace-pre-wrap break-words">{failedAnalyses.find(a => a.index === originalIdx)?.explanation}</div>
                                        </div>
                                      )}
                                    </div>
                                  </div>
                                </Card>
                              ))}
                          </div>
                        </div>
                      )}
                      {/* Duplicate nextSuggestion card removed - suggestion now only shown in the hints/summary box above */}
                    </div>
                  )}
                </div>
              ) : (
                // Default: show Check Results UI
                <div className="space-y-6">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <div className="w-3 h-3 bg-gradient-to-r from-blue-400 to-purple-400 rounded-full"></div>
                      <h3 className="text-xl font-semibold text-slate-100">Test Results</h3>
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
                        <div className="text-lg font-semibold text-slate-200">{results}</div>
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
                                <span className="text-xs font-extrabold uppercase tracking-wide text-pink-500">Test Case {i + 1}</span>
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
                                  <div className="font-mono text-white text-sm leading-snug whitespace-pre-wrap break-words">{example.input}</div>
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
                                  <div className="font-mono text-white text-sm leading-snug whitespace-pre-wrap break-words">{example.output}</div>
                                </div>

                                {failed && (
                                  <div>
                                    <div className="text-sm font-extrabold text-red-400 mb-0.5 uppercase tracking-wide">Your Output</div>
                                    <div className="font-mono text-white text-sm leading-snug whitespace-pre-wrap break-words">{userOutputs[i] || ''}</div>
                                    {/* Failed case analysis if available */}
                  {failedAnalyses.find(a => a.index === i) && (
                                      <div className="mt-2 p-2 rounded border border-amber-500/30 bg-amber-500/10">
                    <div className="text-amber-300 text-xs font-semibold mb-1">Why test case {i + 1} failed</div>
                                        <div className="text-amber-200 text-xs whitespace-pre-wrap break-words">{failedAnalyses.find(a => a.index === i)?.explanation}</div>
                                      </div>
                                    )}
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
                          <h4 className="text-lg font-semibold text-emerald-300 mb-2">Congratulations!</h4>
                          <p className="text-slate-300">All test cases passed. Ready to submit your solution?</p>
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="text-center py-12">
                      <div className="w-16 h-16 mx-auto mb-4 bg-gradient-to-r from-blue-500/20 to-purple-500/20 rounded-full flex items-center justify-center">
                        <Play className="w-8 h-8 text-blue-400" />
                      </div>
                      <h4 className="text-lg font-semibold text-slate-200 mb-2">Ready to test your code?</h4>
                      <p className="text-slate-400">Click the &quot;Check&quot; button to execute your solution against the test cases.</p>
                    </div>
                  )}
                </div>
              )}
            </Card>
            
            {/* Submission results are now shown inside the Test Results panel above */}
          </div>
        </div>
      </div>
    </div>
  );
}
