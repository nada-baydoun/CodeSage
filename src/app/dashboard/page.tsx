"use client";
import React, { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import Link from "next/link";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { setStatus as setStatusShared, type Status as SharedStatus } from "@/lib/status";
import { loadStatusMap } from "@/lib/status";
import { User, BarChart2, PieChart, Search, Filter, ChevronUp, ChevronDown } from "lucide-react";

type ProblemMeta = { id: string; tags?: string[]; name?: string; contestId?: number; index?: string; rating?: number };
type Status = SharedStatus;

function useProblemsetMeta(): { problems: ProblemMeta[]; loading: boolean } {
  const [data, setData] = useState<ProblemMeta[]>([]);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const bust = `?t=${Date.now()}`;
        const res = await fetch(`/data/problemset_complete.json${bust}`, { cache: "no-store" });
        if (!res.ok) throw new Error("problemset fetch failed");
        const arr = await res.json();
        const mapped: ProblemMeta[] = Array.isArray(arr)
          ? arr.map((p: any) => ({
              id: p?.id || (p?.contestId && p?.index ? `${p.contestId}/${p.index}` : ""),
              tags: Array.isArray(p?.tags) ? p.tags : [],
              name: p?.name,
              contestId: p?.contestId,
              index: p?.index,
              rating: p?.rating,
            }))
          : [];
        if (mounted) setData(mapped.filter((p) => p.id));
      } catch {
        if (mounted) setData([]);
      } finally {
        if (mounted) setLoading(false);
      }
    })();
    return () => { mounted = false; };
  }, []);
  return { problems: data, loading };
}

function percent(n: number, d: number): number { return d > 0 ? Math.round((n * 1000) / d) / 10 : 0; }

const STATUS_LIST: Status[] = ["viewed", "tried", "accepted", "rejected"]; 
const COLORS: Record<string, string> = { viewed: "#38bdf8", tried: "#f59e0b", accepted: "#22c55e", rejected: "#ef4444" };

// Tag helpers (copied exactly from problems page for identical abbreviations/titles)
const TAG_MAP: Record<string,string> = {
  "binary search":"BS","ternary search":"TS","two pointers":"TP","brute force":"BF","data structures":"DS",
  "dynamic programming":"DP","graphs":"GR","graph matchings":"GM","shortest paths":"SP","depth-first search":"DFS",
  "dfs and similar":"DFSS","breadth-first search":"BFS","disjoint set union":"DSU","math":"MATH","number theory":"NT",
  "combinatorics":"COMB","greedy":"GRD","divide and conquer":"DAC","constructive algorithms":"CA","strings":"STR",
  "bitmasks":"BIT","implementation":"IMP","hashing":"HASH","sortings":"SORT","geometry":"GEO","probabilities":"PROB",
  "interactive":"INT","trees":"TREE",
};
function abbr(tag: string) {
  const t = tag.toLowerCase();
  if (TAG_MAP[t]) return TAG_MAP[t];
  const m = t.match(/[a-z0-9]+/g) || [];
  const s = m.map(w => w[0]).join("").toUpperCase();
  return s || tag.slice(0,3).toUpperCase();
}
const CANONICAL_TAGS: Record<string, string> = { "dynamic programming": "dp", "dp": "dp" };
const TAG_TITLES: Record<string, string> = {
  "bs":"Binary Search","binary search":"Binary Search","tp":"Two Pointers","two pointers":"Two Pointers",
  "bf":"Brute Force","brute force":"Brute Force","ds":"Data Structures","data structures":"Data Structures",
  "dp":"Dynamic Programming","graphs":"Graphs","graph matchings":"Graph Matchings","shortest paths":"Shortest Paths",
  "depth-first search":"Depth-First Search","dfs and similar":"DFS and Similar","breadth-first search":"Breadth-First Search",
  "disjoint set union":"Disjoint Set Union","math":"Math","number theory":"Number Theory","combinatorics":"Combinatorics",
  "greedy":"Greedy","divide and conquer":"Divide and Conquer","constructive algorithms":"Constructive Algorithms",
  "strings":"Strings","bitmasks":"Bitmasks","implementation":"Implementation","hashing":"Hashing","sortings":"Sortings",
  "geometry":"Geometry","probabilities":"Probabilities","interactive":"Interactive","trees":"Trees","ternary search":"Ternary Search",
};
const TAG_LABELS: Record<string, string> = { "dp":"DP","dfs and similar":"DFS+","divide and conquer":"DAC","sortings":"SORT","ternary search":"TS" };
function canonicalizeTag(tag: string){ const t = tag.trim().toLowerCase(); return CANONICAL_TAGS[t] || t; }
function tagLabel(tag: string){ const t = canonicalizeTag(tag); if (TAG_LABELS[t]) return TAG_LABELS[t]; if (TAG_MAP[t]) return TAG_MAP[t]; return abbr(t); }
function tagTitle(tag: string){ const t = canonicalizeTag(tag); if (TAG_TITLES[t]) return TAG_TITLES[t]; return t.replace(/\b\w/g,(m)=>m.toUpperCase()); }

// Small status icon used in table
function StatusIconSmall({ status }: { status: Status }) {
  switch (status) {
  case "viewed": return <span title="Viewed" className="inline-block w-3 h-3 rounded-full status-dot-viewed" />;
  case "tried": return <span title="Tried" className="inline-block w-3 h-3 rounded-full status-dot-tried" />;
  case "accepted": return <span title="Accepted" className="inline-block w-3 h-3 rounded-full status-dot-accepted" />;
  case "rejected": return <span title="Rejected" className="inline-block w-3 h-3 rounded-full status-dot-rejected" />;
    default: return <span title="Not tried" className="inline-block w-3 h-3 rounded-full bg-slate-700" />;
  }
}

// Full status icon used in problems table (matches Problems page)
function StatusIcon({ status, className }: { status: Status | "none"; className?: string }) {
  switch (status) {
    case "viewed": return <span className={className || "text-lg"} title="You viewed the problem">🔵</span>;
    case "tried": return <span className={className || "text-lg"} title="You tried to solve the problem">🟡</span>;
    case "accepted": return <span className={className || "text-lg"} title="You solved the problem (Accepted)">🟢</span>;
    case "rejected": return <span className={className || "text-lg"} title="You submitted an incorrect solution (Rejected)">🔴</span>;
    default: return <span className={className || "text-lg"} title="Not tried">⚪</span>;
  }
}

// Difficulty helpers (copied from problems page to match styling)
function ratingBand(r: number) {
  if (r <= 1200) return "Easy";
  if (r <= 1900) return "Medium";
  return "Hard";
}
function ratingBucket(r: number) {
  const clamped = Math.min(Math.max(r, 800), 3500);
  const i = Math.round((clamped - 800) / 100);
  return 800 + i * 100;
}
function ratingHeatClass(r: number) {
  return `rating-h-${ratingBucket(r)}`;
}

function statusExplanation(s: Status | "none") {
  switch (s) {
    case "none": return "You haven't interacted with this problem yet";
    case "viewed": return "You viewed the problem";
    case "tried": return "You tried to solve the problem";
    case "accepted": return "You solved the problem (Accepted)";
    case "rejected": return "You submitted an incorrect solution (Rejected)";
  }
}

export default function DashboardPage() {
  const statusMap = loadStatusMap();
  const attemptedIds = Object.keys(statusMap).filter((id) => statusMap[id] !== "none");
  const attemptedCount = attemptedIds.length;

  const countsByStatus = STATUS_LIST.reduce((acc, s) => ({ ...acc, [s]: attemptedIds.filter((id) => statusMap[id] === s).length }), {} as Record<Status, number>);
  const totalNonNone = attemptedCount;

  const { problems, loading } = useProblemsetMeta();
  const [mounted, setMounted] = useState(false);
  useEffect(() => { setMounted(true); }, []);
  // Build tag counts with optional status filter
  const [statusFilter, setStatusFilter] = useState<Status | "all">("all");
  const tagCounts = useMemo(() => {
    const map = new Map<string, number>();
    for (const id of attemptedIds) {
      if (statusFilter !== "all" && statusMap[id] !== statusFilter) continue;
      const meta = problems.find((p) => p.id === id);
      const tags = (meta?.tags || []).map((t) => String(t));
      for (const t of tags) map.set(t, (map.get(t) || 0) + 1);
    }
    return Array.from(map.entries()).sort((a, b) => b[1] - a[1]);
  }, [attemptedIds, statusFilter, statusMap, problems]);

  // Hint Powered Analysis
  const [hintData, setHintData] = useState<{ byProblem: Array<{ id: string; count: number; errorCounts: Record<string, number> }>; totalByClass: Record<string, number>; totalHints: number } | null>(null);
  const [selectedProblem, setSelectedProblem] = useState<string>("");
  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const bust = `?t=${Date.now()}`;
        const res = await fetch(`/api/hints/list${bust}`, { cache: "no-store" });
        const data = await res.json();
        if (mounted) {
          setHintData(data);
          const first = (data?.byProblem || []).find((p: any) => p.id !== '306/A')?.id ?? (data?.byProblem?.[0]?.id ?? "");
          setSelectedProblem(first);
        }
      } catch {
        if (mounted) setHintData({ byProblem: [], totalByClass: {}, totalHints: 0 });
      }
    })();
    return () => { mounted = false; };
  }, []);

  // attempted problems (client-only): any non-'none' status
  const attemptedProblems = useMemo(() => {
    if (!mounted) return [] as ProblemMeta[];
    try {
      const ids = attemptedIds; // already filtered to non-none
      return problems.filter((p) => ids.includes(p.id));
    } catch { return []; }
  }, [mounted, attemptedIds, statusMap, problems]);

  // Table filters and pagination for attempted problems
  const [apSearch, setApSearch] = useState("");
  // full problems-style filters
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [tagPanelOpen, setTagPanelOpen] = useState(false);
  const [selectedStatuses, setSelectedStatuses] = useState<Status[]>([]);
  const [statusPanelOpen, setStatusPanelOpen] = useState(false);
  const [minDifficulty, setMinDifficulty] = useState<number>(800);
  const [maxDifficulty, setMaxDifficulty] = useState<number>(3500);
  const [minDifficultyInput, setMinDifficultyInput] = useState<string>("800");
  const [maxDifficultyInput, setMaxDifficultyInput] = useState<string>("3500");
  const [apTag, setApTag] = useState("");
  const [apStatus, setApStatus] = useState<Status | "all">("all");
  const [apPage, setApPage] = useState(1);
  const apPerPage = 8;

  const availableTagsForAttempted = useMemo(() => {
    const s = new Set<string>();
    for (const p of attemptedProblems) if (Array.isArray(p.tags)) for (const t of p.tags) s.add(t);
    return Array.from(s).sort((a,b)=>a.localeCompare(b));
  }, [attemptedProblems]);

  // helper to toggle tags for selectedTags
  function toggleTag(tag: string) {
    setSelectedTags(prev => prev.includes(tag) ? prev.filter(t => t !== tag) : [...prev, tag]);
  }

  // filter with full parity to problems page but scoped to attemptedProblems
  const filteredAttempted = useMemo(() => {
    let arr = attemptedProblems.slice();
    const q = apSearch.trim().toLowerCase();
    if (q) {
      arr = arr.filter(p => {
        const name = (p.name || "").toLowerCase();
        const id = (p.id || "").toLowerCase();
        const tagsMatch = Array.isArray(p.tags) && p.tags.some(t => t.toLowerCase().includes(q));
        return name.includes(q) || id.includes(q) || tagsMatch;
      });
    }

    // tags: selectedTags (multi) OR single apTag for quick select compatibility
    if (selectedTags.length > 0) {
      arr = arr.filter(p => selectedTags.some(sel => Array.isArray(p.tags) && p.tags.some(pt => canonicalizeTag(pt) === canonicalizeTag(sel))));
    } else if (apTag) {
      arr = arr.filter(p => Array.isArray(p.tags) && p.tags.includes(apTag));
    }

    // statuses: selectedStatuses (multi) or apStatus (single)
    if (selectedStatuses.length > 0) {
      arr = arr.filter(p => selectedStatuses.includes((statusMap[p.id] as Status) || "none"));
    } else if (apStatus !== "all") {
      arr = arr.filter(p => statusMap[p.id] === apStatus);
    }

    // difficulty range
    arr = arr.filter(p => {
      const r = typeof p.rating === 'number' ? p.rating : 0;
      return r >= minDifficulty && r <= maxDifficulty;
    });

    return arr;
  }, [attemptedProblems, apSearch, apTag, apStatus, selectedTags, selectedStatuses, minDifficulty, maxDifficulty, statusMap]);

  // reset page when filters change
  useEffect(() => { setApPage(1); }, [apSearch, selectedTags, selectedStatuses, minDifficulty, maxDifficulty]);

  const apTotal = filteredAttempted.length;
  const apStart = (apPage - 1) * apPerPage;
  const apSlice = filteredAttempted.slice(apStart, apStart + apPerPage);

  return (
    <div className="min-h-screen bg-slate-950">
      {/* Header with nav */}
      <header className="sticky top-0 z-40 border-b border-slate-800/50 glass-nav">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <Link href="/" className="text-slate-200 font-semibold">← Back</Link>
          <div className="flex items-center gap-3">
            <User className="w-5 h-5 text-white" />
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-6 py-8 space-y-8">
        <h1 className="text-3xl font-bold text-slate-100 text-center">Your Dashboard</h1>

        {/* Attempted count */}
        <Card className="glass-card p-8">
          <div className="flex flex-col items-center justify-center text-center">
            <div className="text-slate-300 text-lg">Problems Attempted</div>
            <div className="attempted-count text-blue-300 mt-2 leading-none">{mounted ? attemptedCount : <span className="text-slate-500">—</span>}</div>
          </div>

          {/* Problems-style attempted problems list (exact parity with ProblemSet page, limited to attempted only) */}
          <div className="mt-6">
            <div className="text-slate-300 text-sm mb-2">Attempted problems</div>

            {!mounted ? (
              <div className="text-slate-400 text-sm">Loading...</div>
            ) : attemptedProblems.length === 0 ? (
              <div className="text-slate-400 text-sm">You haven't attempted any problems yet.</div>
            ) : (
              <>
                {/* Filters (exact panels from problems page) */}
                <Card className={`glass-card p-6 mb-6 relative overflow-visible ${(tagPanelOpen || statusPanelOpen) ? "z-50" : ""}`}>
                  <div className="relative z-10">
                    <div className="flex flex-wrap gap-4 items-center">
                      <div className="flex-1 min-w-[260px]">
                        <label className="flex items-center gap-2 text-sm font-medium text-white mb-3">
                          <span>Search</span>
                          <Search className="w-4 h-4 text-white" />
                        </label>
                        <div>
                          <input
                            type="text"
                            placeholder="Search by title, tag, or ID…"
                            value={apSearch}
                            onChange={(e)=>{ setApSearch(e.target.value); setApPage(1); }}
                            className="w-full px-3 py-3 bg-transparent !text-white placeholder:!text-white/80 border-none rounded-xl focus:outline-none focus:ring-0 active:ring-0 active:outline-none transition-all text-base"
                          />
                        </div>
                      </div>

                      {/* Multi-tag selector */}
                      <div className="min-w-[240px] relative">
                        <label className="block text-sm font-medium text-white mb-3">Tags</label>
                        <Button
                          type="button"
                          onClick={()=>setTagPanelOpen(v=>!v)}
                          className="w-full justify-between bg-transparent !text-white py-3 border-none shadow-none ring-0 focus:ring-0 focus-visible:ring-0 focus:outline-none active:ring-0 tag-filter-trigger"
                          title="Select one or more tags"
                        >
                          <span className="flex items-center gap-2 overflow-hidden">
                            <Filter className="w-4 h-4 shrink-0" />
                            {selectedTags.length === 0 ? (
                              <span className="truncate !text-white">All tags</span>
                            ) : (
                              <span className="flex items-center gap-1 flex-wrap">
                                {selectedTags.slice(0,3).map((tag) => (
                                  <span key={`btn-${tag}`} className="px-1.5 py-0.5 rounded-md text-[10px] font-medium bg-purple-500/20 text-white" title={tagTitle(tag)}>{tagLabel(tag)}</span>
                                ))}
                                {selectedTags.length > 3 && <span className="text-white/70 text-xs">+{selectedTags.length - 3}</span>}
                              </span>
                            )}
                          </span>
                          {tagPanelOpen ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                        </Button>

                        {tagPanelOpen && (
                          <div className="absolute z-[9999] mt-2 w-full max-h-80 overflow-auto rounded-xl bg-slate-900 shadow-2xl p-3">
                            <div className="flex flex-wrap gap-2 min-h-8">
                              {availableTagsForAttempted.length === 0 && (
                                <span className="text-white/70 text-sm px-1">No tags available</span>
                              )}
                              {availableTagsForAttempted.map(tag => {
                                const active = selectedTags.includes(tag);
                                return (
                                  <button
                                    key={tag}
                                    type="button"
                                    onClick={()=>toggleTag(tag)}
                                    className={`px-2 py-1 rounded-lg text-xs tag-option border-none outline-none focus:outline-none focus:ring-0 active:ring-0 ${active ? "text-white" : "text-white/80 hover:text-white"}`}
                                    title={tagTitle(tag)}
                                  >
                                    {tagLabel(tag)}
                                  </button>
                                );
                              })}
                            </div>
                            {selectedTags.length > 0 && (
                              <div className="flex justify-end mt-3 gap-2">
                                <Button type="button" className="px-3 py-1 border-none shadow-none tag-action" onClick={()=>setSelectedTags([])}>Clear</Button>
                                <Button type="button" className="px-3 py-1 border-none shadow-none tag-action" onClick={()=>setTagPanelOpen(false)}>Done</Button>
                              </div>
                            )}
                          </div>
                        )}
                      </div>

                      {/* Status selector */}
                      <div className="min-w-[240px] relative">
                        <label className="block text-sm font-medium text-white mb-3">Status</label>
                        <Button
                          type="button"
                          onClick={()=>setStatusPanelOpen(v=>!v)}
                          className="w-full justify-between bg-transparent !text-white py-3 border-none shadow-none ring-0 focus:ring-0 focus-visible:ring-0 focus:outline-none active:ring-0 tag-filter-trigger"
                          title="Select one or more statuses"
                        >
                          <span className="flex items-center gap-2 overflow-hidden">
                            <Filter className="w-4 h-4 shrink-0" />
                            {selectedStatuses.length === 0 ? (
                              <span className="truncate !text-white">All statuses</span>
                            ) : (
                              <span className="flex items-center gap-1 flex-wrap">
                                {selectedStatuses.slice(0,3).map((s) => (
                                  <span key={`sb-${s}`} className="px-1.5 py-0.5 rounded-md text-[10px] font-medium bg-slate-500/20 text-white" title={s[0].toUpperCase() + s.slice(1)}>{s}</span>
                                ))}
                                {selectedStatuses.length > 3 && <span className="text-white/70 text-xs">+{selectedStatuses.length - 3}</span>}
                              </span>
                            )}
                          </span>
                          {statusPanelOpen ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                        </Button>

                        {statusPanelOpen && (
                          <div className="absolute z-[9999] mt-2 w-full max-h-80 overflow-auto rounded-xl bg-slate-900 shadow-2xl p-3">
                            <div className="flex flex-wrap gap-2 min-h-8">
                              {['none', ...STATUS_LIST].map(st => {
                                const active = selectedStatuses.includes(st as Status);
                                const label = st === 'none' ? 'Not tried' : (st as string)[0].toUpperCase() + (st as string).slice(1);
                                return (
                                  <button key={st} type="button" onClick={()=>setSelectedStatuses(prev => prev.includes(st as Status) ? prev.filter(s=>s!==st as Status) : [...prev, st as Status])} className={`px-2 py-1 rounded-lg text-xs tag-option border-none outline-none focus:outline-none focus:ring-0 active:ring-0 ${active ? "text-white" : "text-white/80 hover:text-white"}`} title={statusExplanation as any}>
                                    <span className="inline-flex items-center gap-2"><StatusIcon status={st as Status} className="text-base" /><span>{label}</span></span>
                                  </button>
                                );
                              })}
                            </div>
                            {selectedStatuses.length > 0 && (
                              <div className="flex justify-end mt-3 gap-2">
                                <Button type="button" className="px-3 py-1 border-none shadow-none tag-action" onClick={()=>setSelectedStatuses([])}>Clear</Button>
                                <Button type="button" className="px-3 py-1 border-none shadow-none tag-action" onClick={()=>setStatusPanelOpen(false)}>Done</Button>
                              </div>
                            )}
                          </div>
                        )}
                      </div>

                      {/* Difficulty Range */}
                      <div className="min-w-[260px]">
                        <label className="block text-sm font-medium text-white mb-3">Difficulty Range</label>
                        <div className="space-y-3">
                          <div className="flex items-center gap-3">
                            <div className="flex-1">
                              <label htmlFor="min-difficulty" className="block text-xs text-white/80 mb-1">Min</label>
                              <input
                                id="min-difficulty"
                                type="text"
                                value={minDifficultyInput}
                                placeholder="800"
                                onChange={(e) => {
                                  const raw = e.target.value;
                                  setMinDifficultyInput(raw);
                                  if (/^\d+$/.test(raw)) {
                                    const val = parseInt(raw, 10);
                                    if (val >= 800 && val <= 3500) setMinDifficulty(val);
                                  }
                                }}
                                className="w-full px-3 py-2.5 bg-transparent !text-white placeholder:!text-white/80 border-none rounded-lg focus:outline-none focus:ring-0 active:ring-0"
                              />
                            </div>
                            <div className="flex-1">
                              <label htmlFor="max-difficulty" className="block text-xs text-white/80 mb-1">Max</label>
                              <input
                                id="max-difficulty"
                                type="text"
                                value={maxDifficultyInput}
                                placeholder="3500"
                                onChange={(e) => {
                                  const raw = e.target.value;
                                  setMaxDifficultyInput(raw);
                                  if (/^\d+$/.test(raw)) {
                                    const val = parseInt(raw, 10);
                                    if (val >= 800 && val <= 3500) setMaxDifficulty(val);
                                  }
                                }}
                                className="w-full px-3 py-2.5 bg-transparent !text-white placeholder:!text-white/80 border-none rounded-lg focus:outline-none focus:ring-0 active:ring-0"
                              />
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </Card>

                {/* Table (exact same markup/styling as problems page) */}
                <Card className="glass-card overflow-hidden mt-2">
                  <div className="stable-table-container">
                    <table className="w-full table-fixed">
                      <thead>
                        <tr className="border-b border-slate-700/50">
                          <th className="sticky top-0 z-10 bg-slate-950/80 backdrop-blur supports-[backdrop-filter]:bg-slate-950/60 text-center p-6 pl-2 text-sm font-medium text-white/80 uppercase tracking-wide w-20">Status</th>
                          <th className="sticky top-0 z-10 bg-slate-950/80 backdrop-blur supports-[backdrop-filter]:bg-slate-950/60 text-left p-6 text-sm font-medium text-white/80 uppercase tracking-wide w-auto">Problem</th>
                          <th className="sticky top-0 z-10 bg-slate-950/80 backdrop-blur supports-[backdrop-filter]:bg-slate-950/60 text-center p-6 text-sm font-medium text-white/80 uppercase tracking-wide cursor-pointer select-none w-24">Difficulty</th>
                          <th className="sticky top-0 z-10 bg-slate-950/80 backdrop-blur supports-[backdrop-filter]:bg-slate-950/60 text-left p-6 text-sm font-medium text-white/80 uppercase tracking-wide w-64">Tags</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-700/50">
                        {apSlice.map((p: ProblemMeta) => {
                          const st: Status = (statusMap[p.id] as Status) || "none";
                          return (
                            <tr key={p.id} className="odd:bg-slate-900/10 even:bg-slate-900/5 hover:bg-slate-800/40 transition-colors group h-16">
                              <td className="p-6 pl-2 w-20 align-middle text-center">
                                <div className="flex items-center justify-center">
                                  <span className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-slate-800/60 border border-slate-700/60 shadow-sm hover:ring-1 hover:ring-blue-500/40 transition">
                                    <StatusIcon status={st} />
                                  </span>
                                </div>
                              </td>

                              <td className="p-6 w-auto align-middle">
                                {p.contestId && p.index ? (
                                  <Link
                                    href={`/problems/${p.contestId}/${p.index}`}
                                    className="text-white hover:text-blue-400 transition-colors font-medium group-hover:text-blue-400 block truncate"
                                    title="Open the problem"
                                    onClick={()=>{ setStatusShared(p.id, 'viewed'); }}
                                  >
                                    {p.contestId}{p.index}. {p.name}
                                  </Link>
                                ) : (
                                  <div className="text-white truncate">{p.name}</div>
                                )}
                              </td>

                              <td className="p-4 w-24 align-middle text-center">
                                <span
                                  className={`inline-block px-2 py-0.5 rounded-md text-xs font-medium rating-heat shadow-sm my-1 ${p.rating ? ratingHeatClass(p.rating) : ''}`}
                                  title={p.rating ? `Rating ${p.rating} (${ratingBand(p.rating)})` : ''}
                                  aria-label={p.rating ? `Rating ${p.rating}` : 'No rating'}
                                >
                                  {p.rating ?? '—'}
                                </span>
                              </td>

                              <td className="p-6 w-64 align-middle">
                                <div className="flex flex-wrap gap-1.5 overflow-hidden max-h-12">
                                  {(p.tags || []).map(tag => (
                                    <span
                                      key={`${p.id}-${tag}`}
                                      className="badge badge-tag text-xs px-2 py-0.5 rounded-md bg-slate-800/40 text-white hover:bg-slate-800/60 transition"
                                      title={tagTitle(tag)}
                                    >
                                      {tagLabel(tag)}
                                    </span>
                                  ))}
                                </div>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </Card>

                {/* Pagination controls (match problems page) */}
                {filteredAttempted.length > 0 && (
                  <div className="flex items-center justify-between mt-6">
                    <div className="text-sm text-white/80">
                      Showing <span className="text-white font-medium">{apStart + 1}</span> to <span className="text-white font-medium">{Math.min(apStart + apPerPage, filteredAttempted.length)}</span> of <span className="text-white font-medium">{filteredAttempted.length.toLocaleString()}</span> problems
                    </div>

                    <div className="flex items-center space-x-2">
                      <Button
                        onClick={() => setApPage(p => Math.max(1, p - 1))}
                        disabled={apPage === 1}
                        className="bg-transparent !text-white border-none shadow-none hover:bg-slate-800/40 disabled:opacity-50 disabled:cursor-not-allowed focus-visible:ring-0 focus:ring-0 focus:outline-none active:ring-0 pagination-btn"
                      >
                        <ChevronUp className="w-4 h-4 rotate-[-90deg]" />
                        Previous
                      </Button>

                      <div className="flex items-center space-x-1">
                        {apPage > 3 && Math.ceil(filteredAttempted.length / apPerPage) > 5 && (
                          <>
                            <Button
                              onClick={() => setApPage(1)}
                              className="w-10 h-10 p-0 bg-transparent !text-white border-none shadow-none hover:bg-slate-800/40 focus-visible:ring-0 focus:ring-0 focus:outline-none active:ring-0 pagination-btn"
                            >
                              1
                            </Button>
                            {apPage > 4 && <span className="text-white/70 px-2">...</span>}
                          </>
                        )}

                        {Array.from({ length: Math.min(5, Math.ceil(filteredAttempted.length / apPerPage)) }, (_, i) => {
                          const totalPages = Math.ceil(filteredAttempted.length / apPerPage);
                          let pageNum;
                          if (totalPages <= 5) pageNum = i + 1;
                          else if (apPage <= 3) pageNum = i + 1;
                          else if (apPage >= totalPages - 2) pageNum = totalPages - 4 + i;
                          else pageNum = apPage - 2 + i;
                          return (
                            <Button
                              key={pageNum}
                              onClick={() => setApPage(pageNum)}
                              className={`w-10 h-10 p-0 bg-transparent !text-white border-none shadow-none focus-visible:ring-0 focus:ring-0 focus:outline-none active:ring-0 pagination-btn ${apPage === pageNum ? "pagination-active" : ""}`}
                            >
                              {pageNum}
                            </Button>
                          );
                        })}

                        {apPage < Math.ceil(filteredAttempted.length / apPerPage) - 2 && Math.ceil(filteredAttempted.length / apPerPage) > 5 && (
                          <>
                            {apPage < Math.ceil(filteredAttempted.length / apPerPage) - 3 && <span className="text-white/70 px-2">...</span>}
                            <Button
                              onClick={() => setApPage(Math.ceil(filteredAttempted.length / apPerPage))}
                              className="w-10 h-10 p-0 bg-transparent !text-white border-none shadow-none hover:bg-slate-800/40 focus-visible:ring-0 focus:ring-0 focus:outline-none active:ring-0 pagination-btn"
                            >
                              {Math.ceil(filteredAttempted.length / apPerPage)}
                            </Button>
                          </>
                        )}
                      </div>

                      <Button
                        onClick={() => setApPage(p => Math.min(Math.ceil(filteredAttempted.length / apPerPage), p + 1))}
                        disabled={apPage === Math.ceil(filteredAttempted.length / apPerPage)}
                        className="bg-transparent !text-white border-none shadow-none hover:bg-slate-800/40 disabled:opacity-50 disabled:cursor-not-allowed focus-visible:ring-0 focus:ring-0 focus:outline-none active:ring-0 pagination-btn"
                      >
                        Next
                        <ChevronUp className="w-4 h-4 rotate-[90deg]" />
                      </Button>
                    </div>

                    <div className="text-sm text-white/80">
                      Page <span className="text-white font-medium">{apPage}</span> of <span className="text-white font-medium">{Math.ceil(filteredAttempted.length / apPerPage).toLocaleString()}</span>
                      <div className="text-xs text-white/60 mt-1">Use ← → keys to navigate</div>
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        </Card>

        {/* Status: list left + pie right */}
        <Card className="glass-card p-6">
          <div className="text-slate-100 font-semibold mb-4">Status breakdown</div>
          <div className="flex items-center justify-center">
            {mounted ? (
              <StatusPie counts={countsByStatus} total={totalNonNone} />
            ) : (
              <div className="w-40 h-40 bg-slate-900/40 rounded-full flex items-center justify-center text-slate-500">—</div>
            )}
          </div>
        </Card>

        

        {/* Tag bar chart with status filter - now below the filters and styled consistently */}
        <Card className="glass-card p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="text-slate-100 font-semibold flex items-center gap-2"><BarChart2 className="w-5 h-5 text-blue-400" /> Tags worked on</div>
          </div>

          {/* Chart with filters beside it implemented as a 1x2 table (transparent) */}
          <div className="min-h-[260px]">
            <table className="transparent-table w-full">
              <tbody>
                <tr>
                  <td className="table-cell-center">
                    <div className="flex items-center justify-center">
                      {loading && <div className="text-slate-400 text-sm">Loading tags</div>}
                      {!mounted && <div className="text-slate-400 text-sm">Loading user data</div>}
                      {mounted && !loading && tagCounts.length === 0 && <div className="text-slate-400 text-sm">No tag data yet.</div>}
                      {mounted && !loading && tagCounts.length > 0 && (
                        <TagBarChart data={tagCounts.slice(0, 12)} color={statusFilter === "all" ? "#60a5fa" : COLORS[statusFilter as string]} width={520} height={260} />
                      )}
                    </div>
                  </td>
                  <td className="table-cell-center w-28">
                    <div className="text-sm text-slate-200 font-medium mb-2">Filters</div>
                    <div className="space-y-3 flex flex-col items-center">
                      <div className="w-full">
                        <label className="block text-xs text-slate-400 mb-1 text-center">Status</label>
                        <select aria-label="Tag chart status" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value as any)} className="w-full transparent-select border border-transparent text-slate-200 text-sm rounded px-3 py-2">
                          <option value="all">All statuses</option>
                          {STATUS_LIST.map(s => <option key={s} value={s}>{s[0].toUpperCase() + s.slice(1)}</option>)}
                        </select>
                      </div>
                    </div>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </Card>

        {/* Hint Powered Analysis */}
        <Card className="glass-card p-6">
          <div className="flex flex-col items-center text-center">
            <div className="attempted-count-sm gradient-text font-extrabold mb-1 leading-none">Hints Powered Analysis</div>
            <div className="text-slate-400 text-sm mb-4">{`You used in total ${hintData?.totalHints ?? 0} hint(s)`}</div>
          </div>
        </Card>

        {/* Error Analysis (separate card) */}
        <Card className="glass-card p-6">
          <div className="text-slate-100 font-semibold mb-4">Error Analysis</div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-center">
            {/* Left: list of problems with counts */}
            <div className="space-y-2">
              {(hintData?.byProblem || []).length === 0 ? (
                <div className="text-slate-400 text-sm">No hints recorded yet.</div>
              ) : (
                (hintData!.byProblem).filter(p => p.id !== '306/A').slice(0, 8).map((p) => (
                  <div key={p.id} className="flex items-center justify-between p-2 bg-slate-900/40 rounded border border-slate-700/50">
                    <div className="text-slate-200 text-sm font-medium truncate max-w-[70%]" title={p.id}>{p.id}</div>
                    <div className="text-slate-400 text-xs">{p.count} hint(s)</div>
                  </div>
                ))
              )}
            </div>

            {/* Middle: selector */}
            <div className="flex flex-col items-center gap-3">
              <label className="text-slate-300 text-sm" htmlFor="hint-problem">Select problem</label>
              <select id="hint-problem" value={selectedProblem} onChange={(e) => setSelectedProblem(e.target.value)} className="w-1/6 md:w-1/6 transparent-select text-white text-sm rounded px-2 py-0.5">
                {(hintData?.byProblem || []).map((p) => (
                  <option key={p.id} value={p.id}>{p.id}</option>
                ))}
              </select>
            </div>

            {/* Right: donut for selected problem */}
            <div className="flex items-center justify-center">
              <>
                <br />
                <br />
                <Donut data={(hintData?.byProblem || []).find((p) => p.id === selectedProblem)?.errorCounts || {}} />
              </>
            </div>
          </div>

          {/* Global error class donut */}
          <div className="mt-8">
            <div className="text-slate-200 text-sm mb-2">Overall error classes</div>
            <>
              <br />
              <br />
              <div className="flex items-center justify-center">
                {/* Overall error class bar chart (use TagBarChart for parity with the Tags worked on chart) */}
                <TagBarChart
                  data={Object.entries(hintData?.totalByClass || {}).sort((a,b) => b[1] - a[1])}
                  color="#a78bfa"
                  width={520}
                  height={260}
                  axisLabel="Class Error"
                  labelFormatter={(s) => tagTitle(s)}
                />
              </div>
            </>
          </div>
        </Card>

        
      </main>
    </div>
  );
}

function StatusPie({ counts, total }: { counts: Record<Status, number>; total: number }) {
  const entries = STATUS_LIST.map((s) => [s, counts[s]] as const).filter(([, v]) => v > 0);
  const radius = 60;
  const cx = 80, cy = 80;
  // hover state for tooltip
  const [hover, setHover] = React.useState<{ label: string; pct: number; count: number; x: number; y: number } | null>(null);
  let acc = 0;
  const segments = entries.map(([k, v]) => {
    const frac = total ? v / total : 0;
    const startAngle = acc;
    acc += frac * 2 * Math.PI;
    const endAngle = acc;
    return { key: k, count: v, frac, startAngle, endAngle };
  }).filter(s => s.frac > 0);

  return (
  <div className="status-pie-root">
      <svg width={160} height={160} viewBox="0 0 160 160" role="img" aria-label="Status pie chart">
        <circle cx={cx} cy={cy} r={radius} fill="#0f172a" />
        {segments.map((seg, i) => {
          const start = polar(cx, cy, radius, seg.startAngle);
          const end = polar(cx, cy, radius, seg.endAngle);
          const largeArc = seg.frac > 0.5 ? 1 : 0;
          const d = `M ${cx} ${cy} L ${start.x} ${start.y} A ${radius} ${radius} 0 ${largeArc} 1 ${end.x} ${end.y} Z`;
          const midAngle = (seg.startAngle + seg.endAngle) / 2;
          const mid = polar(cx, cy, radius - 18, midAngle);
          const pct = Math.round((seg.frac * 1000)) / 10;
          return (
            <path
              key={seg.key}
              d={d}
              fill={COLORS[seg.key]}
              stroke="#0b1324"
              strokeWidth={0.5}
              onMouseEnter={() => setHover({ label: seg.key, pct, count: seg.count, x: mid.x, y: mid.y })}
              onMouseLeave={() => setHover(null)}
              className="status-pie-seg"
            />
          );
        })}
        {/* outline */}
        <circle cx={cx} cy={cy} r={radius} fill="none" stroke="#0b1324" strokeWidth={1} />

        {/* svg-based tooltip (renders above the hovered segment) */}
        {hover && (
          <g transform={`translate(${hover.x}, ${hover.y - 18})`}>
            <rect x={-52} y={-30} width={104} height={36} rx={6} fill="rgba(2,6,23,0.95)" stroke="rgba(148,163,184,0.12)" />
            <text x={0} y={-12} fill="#ffffff" fontSize={12} fontWeight={600} textAnchor="middle" className="capitalize">{hover.label}</text>
            <text x={0} y={4} fill="#94a3b8" fontSize={11} textAnchor="middle">{hover.pct}% • {hover.count} problem{hover.count !== 1 ? 's' : ''}</text>
          </g>
        )}
      </svg>
    </div>
  );
}

function TagBarChart({ data, color = "#60a5fa", width = 720, height = 260, labelFormatter, axisLabel }: { data: Array<[string, number]>; color?: string; width?: number; height?: number; labelFormatter?: (s: string)=>string; axisLabel?: string }) {
  const margin = { top: 10, right: 20, bottom: 60, left: 48 };
  const innerW = width - margin.left - margin.right;
  const innerH = height - margin.top - margin.bottom;
  const maxVal = Math.max(...data.map((d) => d[1]), 1);
  const barW = innerW / Math.max(data.length, 1);
  const [hover, setHover] = React.useState<{ clientX: number; clientY: number; tag: string; count: number } | null>(null);

  // inject style for positioning bar tooltip when hovering (avoid inline styles)
  React.useEffect(() => {
    if (typeof document === 'undefined') return;
    const id = 'bar-tooltip-pos';
    let styleEl = document.getElementById(id) as HTMLStyleElement | null;
    if (!hover) {
      if (styleEl) styleEl.remove();
      return;
    }
    if (!styleEl) {
      styleEl = document.createElement('style');
      styleEl.id = id;
      document.head.appendChild(styleEl);
    }
    styleEl.innerHTML = `.bar-tooltip{left: ${hover.clientX + 12}px; top: ${hover.clientY - 36}px;}`;
    return () => { if (styleEl) styleEl.remove(); };
  }, [hover]);

  const tooltip = hover ? ((typeof document !== 'undefined' && document.body) ? createPortal(
    <div className="bar-tooltip">
      <div className="bar-tooltip-inner">
        <div className="bar-tooltip-title">{hover.count}</div>
        <div className="bar-tooltip-sub">{hover.tag}</div>
      </div>
    </div>, document.body) : null) : null;

  return (
    <>
      <svg width={width} height={height} role="img" aria-label="Tags bar chart">
        <g transform={`translate(${margin.left},${margin.top})`}>
          {/* y axis */}
          <line x1={0} y1={0} x2={0} y2={innerH} stroke="#ffffff" />
          {/* x axis */}
          <line x1={0} y1={innerH} x2={innerW} y2={innerH} stroke="#ffffff" />
          {/* y ticks */}
          {Array.from({ length: 5 }).map((_, i) => {
            const t = (i / 4) * maxVal;
            const y = innerH - (t / maxVal) * innerH;
            return (
              <g key={i}>
                <line x1={-4} x2={0} y1={y} y2={y} stroke="#ffffff" opacity={0.6} />
                <text x={-8} y={y} fill="#ffffff" opacity={0.9} fontSize={11} textAnchor="end" dominantBaseline="middle">{Math.round(t)}</text>
              </g>
            );
          })}
          {/* bars */}
          {data.map(([tag, count], i) => {
            const h = (count / maxVal) * innerH;
            const x = i * barW + barW * 0.1;
            const y = innerH - h;
            const w = barW * 0.8;
            const cx = x + w / 2;
            return (
              <g key={tag}>
                <rect
                  x={x}
                  y={y}
                  width={w}
                  height={h}
                  fill={color}
                  rx={4}
                  onMouseMove={(e: React.MouseEvent<SVGRectElement>) => {
                    setHover({ clientX: e.clientX, clientY: e.clientY, tag: labelFormatter ? labelFormatter(tag) : tag, count });
                  }}
                  onMouseLeave={() => setHover(null)}
                />
                <text x={cx} y={innerH + 20} fill="#ffffff" fontSize={11} textAnchor="middle" transform={`rotate(0, ${cx}, ${innerH + 20})`}>{labelFormatter ? labelFormatter(tag) : tagLabel(tag)}</text>
              </g>
            );
          })}

          {/* axis labels */}
          <text x={innerW / 2} y={innerH + 46} fill="#ffffff" fontSize={12} textAnchor="middle">{axisLabel || 'Tag'}</text>
        </g>
      </svg>
      {tooltip}
    </>
  );
}

function Donut({ data }: { data: Record<string, number> }) {
  const entries = Object.entries(data).filter(([, v]) => v > 0);
  const total = entries.reduce((s, [, v]) => s + v, 0);
  const radius = 60;
  const cx = 70, cy = 70;
  let acc = 0;
  const palette = ["#22c55e", "#ef4444", "#f59e0b", "#38bdf8", "#a78bfa", "#f472b6", "#34d399"];

  const [hover, setHover] = React.useState<{ label: string; count: number; pct: number; clientX: number; clientY: number } | null>(null);

  // tooltip element rendered into document.body so it appears above all UI
  // inject a small style element to position the tooltip (avoids inline styles)
  React.useEffect(() => {
    if (typeof document === 'undefined') return;
    const id = 'donut-tooltip-pos';
    let styleEl = document.getElementById(id) as HTMLStyleElement | null;
    // if there's no hover, ensure leftover style is removed and exit early
    if (!hover) {
      if (styleEl) styleEl.remove();
      return;
    }
    if (!styleEl) {
      styleEl = document.createElement('style');
      styleEl.id = id;
      document.head.appendChild(styleEl);
    }
    styleEl.innerHTML = `.donut-tooltip{left: ${hover.clientX + 12}px; top: ${hover.clientY - 36}px;}`;
    return () => { if (styleEl) styleEl.remove(); };
  }, [hover]);

  // if no entries, still render a placeholder (after hooks are registered)
  if (entries.length === 0) return <div className="text-slate-400 text-sm">No data</div>;

  const tooltip = hover ? (
    (typeof document !== 'undefined' && document.body) ? createPortal(
      <div className="donut-tooltip">
        <div className="donut-tooltip-inner">
          <div className="donut-tooltip-title">{hover.label}</div>
          <div className="donut-tooltip-sub">{hover.pct}%  {hover.count}</div>
        </div>
      </div>,
      document.body
    ) : null
  ) : null;

  return (
    <div className="flex items-center justify-center">
      <svg width={140} height={140} viewBox="0 0 140 140" role="img" aria-label="Donut chart">
        <circle cx={cx} cy={cy} r={radius} fill="#071024" stroke="#0b1324" strokeWidth={2} />
        {entries.map(([k, v], i) => {
          const frac = total ? v / total : 0;
          const largeArc = frac > 0.5 ? 1 : 0;
          const start = polar(cx, cy, radius, acc);
          acc += frac * 2 * Math.PI;
          const end = polar(cx, cy, radius, acc);
          const d = `M ${start.x} ${start.y} A ${radius} ${radius} 0 ${largeArc} 1 ${end.x} ${end.y}`;
          const pct = Math.round((frac * 1000)) / 10;
          return (
            <path
              key={k}
              d={d}
              stroke={palette[i % palette.length]}
              strokeWidth={18}
              strokeLinecap="butt"
              fill="none"
              onMouseMove={(e: React.MouseEvent<SVGPathElement>) => {
                setHover({ label: k, count: v, pct, clientX: e.clientX, clientY: e.clientY });
              }}
              onMouseLeave={() => setHover(null)}
            />
          );
        })}
      </svg>
      {tooltip}
    </div>
  );
}

function polar(cx: number, cy: number, r: number, angle: number) {
  return { x: cx + r * Math.cos(angle - Math.PI / 2), y: cy + r * Math.sin(angle - Math.PI / 2) };
}
