"use client";

import React, { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Code2, Settings, User, Search, ChevronUp, ChevronDown, Filter } from "lucide-react";

// ==== Types (matches your problemset JSON) ====
type Problem = {
  id: string;
  contestId: number;
  index: string;
  name: string;
  rating: number;   // 800..3500 in your filtered file
  tags: string[];
};

// ==== Local status (MVP via localStorage) ====
type Status = "viewed" | "tried" | "accepted" | "rejected" | "none";

function loadStatusMap(): Record<string, Status> {
  if (typeof window === "undefined") return {};
  try {
    const raw = JSON.parse(localStorage.getItem("cf-status") || "{}");
    const allowed: Status[] = ["none", "viewed", "tried", "accepted", "rejected"];
    const sanitized: Record<string, Status> = {};
    for (const [k, v] of Object.entries(raw || {})) {
      const val = allowed.includes(v as Status) ? (v as Status) : "none";
      sanitized[k] = val === "viewed" ? "none" : val;
    }
    try { localStorage.setItem("cf-status", JSON.stringify(sanitized)); } catch {}
    return sanitized;
  } catch {
    return {};
  }
}
function saveStatus(id: string, s: Status) {
  if (typeof window === "undefined") return;
  const map = loadStatusMap();
  map[id] = s;
  localStorage.setItem("cf-status", JSON.stringify(map));
}

// ==== Difficulty helpers ====
function ratingBand(r: number) {
  if (r <= 1200) return "Easy";
  if (r <= 1900) return "Medium";
  return "Hard";
}

// Heatmap class mapping: buckets every 100 from 800..3500
function ratingBucket(r: number) {
  const clamped = Math.min(Math.max(r, 800), 3500);
  const i = Math.round((clamped - 800) / 100);
  return 800 + i * 100;
}
function ratingHeatClass(r: number) {
  return `rating-h-${ratingBucket(r)}`;
}

// ==== Tag helpers ====
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

// ==== Status icon ====
type StatusIconProps = { status: Status; className?: string };
function StatusIcon({ status, className }: StatusIconProps) {
  switch (status) {
    case "viewed":   return <span className={className || "text-lg"} title="You viewed the problem">🔵</span>;
    case "tried":    return <span className={className || "text-lg"} title="You tried to solve the problem">🟡</span>;
    case "accepted": return <span className={className || "text-lg"} title="You solved the problem (Accepted)">🟢</span>;
    case "rejected": return <span className={className || "text-lg"} title="You submitted an incorrect solution (Rejected)">🔴</span>;
    default:         return <span className={className || "text-lg"} title="Not tried">⚪</span>;
  }
}

const STATUS_ORDER: Status[] = ["none", "viewed", "tried", "accepted", "rejected"];
function statusLabel(s: Status) {
  return s === "none" ? "Not tried" : s.charAt(0).toUpperCase() + s.slice(1);
}
function statusExplanation(s: Status) {
  switch (s) {
    case "none": return "You haven't interacted with this problem yet";
    case "viewed": return "You viewed the problem";
    case "tried": return "You tried to solve the problem";
    case "accepted": return "You solved the problem (Accepted)";
    case "rejected": return "You submitted an incorrect solution (Rejected)";
  }
}

// Clickable status icon that cycles
// ClickableStatusIcon (unused in current layout) removed to keep lint clean

export default function ProblemsPage() {
  const [problems, setProblems] = useState<Problem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>("");
  const [currentPage, setCurrentPage] = useState(1);
  const problemsPerPage = 10;
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [tagPanelOpen, setTagPanelOpen] = useState(false);
  const [selectedStatuses, setSelectedStatuses] = useState<Status[]>([]);
  const [statusPanelOpen, setStatusPanelOpen] = useState(false);
  const [sortDir, setSortDir] = useState<"asc"|"desc">("asc");
  const [minDifficulty, setMinDifficulty] = useState<number>(800);
  const [maxDifficulty, setMaxDifficulty] = useState<number>(3500);
  const [minDifficultyInput, setMinDifficultyInput] = useState<string>("800");
  const [maxDifficultyInput, setMaxDifficultyInput] = useState<string>("3500");
  const [statusMap, setStatusMap] = useState<Record<string, Status>>({});

  useEffect(() => {
    async function loadData() {
      try {
        setLoading(true); setError("");
        const res = await fetch("/data/problemset_complete.json", { cache: "no-store" });
        if (!res.ok) throw new Error(`Failed to fetch: ${res.status} ${res.statusText}`);
        const data = await res.json();
        setProblems(data);
        setStatusMap(loadStatusMap());
      } catch (e) {
        setError(e instanceof Error ? e.message : "Failed to load problems");
      } finally { setLoading(false); }
    }
    loadData();
  }, []);

  const allTags = useMemo(() => {
    const s = new Set<string>();
    for (const p of problems) if (Array.isArray(p.tags)) for (const t of p.tags) if (t) s.add(t);
    return Array.from(s).sort((a,b)=>a.localeCompare(b));
  }, [problems]);

  const availableTags = useMemo(() => {
    const known = Object.keys(TAG_MAP);
    const merged = new Set<string>();
    for (const t of [...allTags, ...known]) merged.add(canonicalizeTag(t));
    return Array.from(merged).sort((a,b)=>a.localeCompare(b));
  }, [allTags]);

  const filtered = useMemo(() => {
    if (problems.length === 0) return [];
    const q = searchTerm.trim().toLowerCase();
    return problems.filter(p => {
      const st: Status = statusMap[p.id] || "none";
      const matchesSearch =
        !q ||
        p.name.toLowerCase().includes(q) ||
        p.tags.some(t => t.toLowerCase().includes(q)) ||
        `${p.contestId}${p.index}`.toLowerCase().includes(q);
      const matchesTags =
        selectedTags.length === 0 ||
        selectedTags.some(sel => p.tags.some(pt => canonicalizeTag(pt) === canonicalizeTag(sel)));
      const matchesStatus =
        selectedStatuses.length === 0 || selectedStatuses.includes(st);
      const matchesDifficulty = p.rating >= minDifficulty && p.rating <= maxDifficulty;
      return matchesSearch && matchesTags && matchesStatus && matchesDifficulty;
    });
  }, [problems, searchTerm, selectedTags, selectedStatuses, minDifficulty, maxDifficulty, statusMap]);

  const sorted = useMemo(() => {
    const copy = [...filtered];
    copy.sort((a, b) => sortDir === "asc" ? a.rating - b.rating : b.rating - a.rating);
    return copy;
  }, [filtered, sortDir]);

  const totalPages = Math.ceil(sorted.length / problemsPerPage);
  const startIndex = (currentPage - 1) * problemsPerPage;
  const endIndex = startIndex + problemsPerPage;
  const paginatedProblems = sorted.slice(startIndex, endIndex);

  useEffect(() => { setCurrentPage(1); }, [searchTerm, selectedTags, selectedStatuses, sortDir, minDifficulty, maxDifficulty]);

  useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      if (e.target && (e.target as HTMLElement).tagName === 'INPUT') return;
      if (e.key === 'ArrowLeft' && currentPage > 1) setCurrentPage(p => p - 1);
      else if (e.key === 'ArrowRight' && currentPage < totalPages) setCurrentPage(p => p + 1);
    };
    document.addEventListener('keydown', handleKeyPress);
    return () => document.removeEventListener('keydown', handleKeyPress);
  }, [currentPage, totalPages]);

  function toggleTag(tag: string) {
    setSelectedTags(prev => prev.includes(tag) ? prev.filter(t => t !== tag) : [...prev, tag]);
  }
  function setStatus(id: string, s: Status) {
    saveStatus(id, s);
    setStatusMap(prev => ({ ...prev, [id]: s }));
  }

  // ==== UI ====
  return (
    <div className="min-h-screen bg-slate-950 text-white">
      {/* Header */}
      <header className="sticky top-0 z-50 border-b border-slate-800/50 glass-nav">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-8">
              <Link href="/" className="flex items-center space-x-3">
                <div className="w-8 h-8 bg-gradient-to-r from-blue-500 to-purple-600 rounded-lg flex items-center justify-center">
                  <Code2 className="w-5 h-5 text-white" />
                </div>
                <span className="text-xl font-bold gradient-text">CodeSage</span>
              </Link>
              <nav className="hidden md:flex space-x-6">
                <Link href="/problems" className="text-blue-400 font-medium text-sm uppercase tracking-wide">Problems</Link>
                <a href="#" className="text-slate-300 hover:text-blue-400 transition-colors text-sm uppercase tracking-wide">Contests</a>
                <a href="#" className="text-slate-300 hover:text-blue-400 transition-colors text-sm uppercase tracking-wide">Learn</a>
                <a href="#" className="text-slate-300 hover:text-blue-400 transition-colors text-sm uppercase tracking-wide">Discuss</a>
              </nav>
            </div>
            <div className="flex items-center space-x-4">
              <Button className="bg-slate-800/50 hover:bg-slate-700/50 text-white border-none shadow-none">
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

      {/* Main */}
      <div className="max-w-7xl mx-auto px-6 py-8">
        <div className="mb-8">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h1 className="text-4xl font-bold gradient-text mb-3">Problem Set</h1>
              <p className="text-slate-300 text-lg">
                Master algorithms and data structures with your curated collection
              </p>
            </div>
          </div>

          {/* Filters */}
          <Card className={`glass-card p-6 mb-6 relative overflow-visible ${(tagPanelOpen || statusPanelOpen) ? "z-50" : ""}`}>
            <div className="relative z-10">
              <div className="flex flex-wrap gap-4 items-center">
                {/* Search */}
                <div className="flex-1 min-w-[260px]">
                  <label className="flex items-center gap-2 text-sm font-medium text-white mb-3">
                    <span>Search</span>
                    <Search className="w-4 h-4 text-white" />
                  </label>
                  <div>
                    <input
                      type="text"
                      placeholder="Search by title, tag, or ID…"
                      value={searchTerm}
                      onChange={(e)=>{ setSearchTerm(e.target.value); }}
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
                            <span
                              key={`btn-${tag}`}
                              className="px-1.5 py-0.5 rounded-md text-[10px] font-medium bg-purple-500/20 text-white"
                              title={tagTitle(tag)}
                            >
                              {tagLabel(tag)}
                            </span>
                          ))}
                          {selectedTags.length > 3 && (
                            <span className="text-white/70 text-xs">+{selectedTags.length - 3}</span>
                          )}
                        </span>
                      )}
                    </span>
                    {tagPanelOpen ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                  </Button>

                  {tagPanelOpen && (
                    <div className="absolute z-[9999] mt-2 w-full max-h-80 overflow-auto rounded-xl bg-slate-900 shadow-2xl p-3">
                      <div className="flex flex-wrap gap-2 min-h-8">
                        {availableTags.length === 0 && (
                          <span className="text-white/70 text-sm px-1">No tags available</span>
                        )}
                        {availableTags.map(tag => {
                          const active = selectedTags.includes(tag);
                          return (
                            <button
                              key={tag}
                              type="button"
                              onClick={()=>toggleTag(tag)}
                              className={`px-2 py-1 rounded-lg text-xs tag-option border-none outline-none focus:outline-none focus:ring-0 active:ring-0 ${
                                active ? "text-white" : "text-white/80 hover:text-white"
                              }`}
                              title={tagTitle(tag)}
                            >
                              {tagLabel(tag)}
                            </button>
                          );
                        })}
                      </div>
                      {selectedTags.length > 0 && (
            <div className="flex justify-end mt-3 gap-2">
                          <Button
                            type="button"
              className="px-3 py-1 border-none shadow-none tag-action"
                            onClick={()=>setSelectedTags([])}
                          >
                            Clear
                          </Button>
                          <Button
                            type="button"
              className="px-3 py-1 border-none shadow-none tag-action"
                            onClick={()=>setTagPanelOpen(false)}
                          >
                            Done
                          </Button>
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
                            <span
                              key={`sb-${s}`}
                              className="px-1.5 py-0.5 rounded-md text-[10px] font-medium bg-slate-500/20 text-white"
                              title={s[0].toUpperCase() + s.slice(1)}
                            >
                              {s}
                            </span>
                          ))}
                          {selectedStatuses.length > 3 && (
                            <span className="text-white/70 text-xs">+{selectedStatuses.length - 3}</span>
                          )}
                        </span>
                      )}
                    </span>
                    {statusPanelOpen ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                  </Button>

                  {statusPanelOpen && (
                    <div className="absolute z-[9999] mt-2 w-full max-h-80 overflow-auto rounded-xl bg-slate-900 shadow-2xl p-3">
                      <div className="flex flex-wrap gap-2 min-h-8">
                        {STATUS_ORDER.map(st => {
                          const active = selectedStatuses.includes(st);
                          const label = statusLabel(st);
                          return (
                            <button
                              key={st}
                              type="button"
                              onClick={()=>setSelectedStatuses(prev => prev.includes(st) ? prev.filter(s=>s!==st) : [...prev, st])}
                              className={`px-2 py-1 rounded-lg text-xs tag-option border-none outline-none focus:outline-none focus:ring-0 active:ring-0 ${
                                active ? "text-white" : "text-white/80 hover:text-white"
                              }`}
                              title={statusExplanation(st)}
                            >
                              <span className="inline-flex items-center gap-2">
                                <StatusIcon status={st} className="text-base" />
                                <span>{label}</span>
                              </span>
                            </button>
                          );
                        })}
                      </div>
                      {selectedStatuses.length > 0 && (
                        <div className="flex justify-end mt-3 gap-2">
                          <Button
                            type="button"
                            className="px-3 py-1 border-none shadow-none tag-action"
                            onClick={()=>setSelectedStatuses([])}
                          >
                            Clear
                          </Button>
                          <Button
                            type="button"
                            className="px-3 py-1 border-none shadow-none tag-action"
                            onClick={()=>setStatusPanelOpen(false)}
                          >
                            Done
                          </Button>
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

          {/* Filter Summary */}
          {(searchTerm || selectedTags.length > 0 || selectedStatuses.length > 0 || minDifficulty > 800 || maxDifficulty < 3500) && (
            <div className="mb-6 flex flex-wrap items-center gap-3 text-sm">
              <span className="text-white/80">Filters:</span>
              {searchTerm && (
                  <span className="px-2 py-1 bg-blue-500/20 text-white rounded-lg">
                    Search: &quot;{searchTerm}&quot;
                  </span>
              )}
              {selectedTags.length > 0 && (
                <div className="flex flex-wrap gap-2 items-center">
                  <span className="text-white/80">Tags:</span>
                  {selectedTags.map((tag) => (
                    <Badge
                      key={`sel-${tag}`}
                      variant="secondary"
                      className="bg-purple-500/20 text-white px-2 py-1 rounded-lg"
                      title={tagTitle(tag)}
                    >
                      <span className="mr-1">{tagLabel(tag)}</span>
                      <button
                        type="button"
                        aria-label={`Remove ${tag}`}
                            className="ml-1 text-white/80 hover:text-white badge-close"
                        onClick={() => setSelectedTags((prev) => prev.filter((t) => t !== tag))}
                      >
                        ×
                      </button>
                    </Badge>
                  ))}
                </div>
              )}
              {selectedStatuses.length > 0 && (
                <div className="flex flex-wrap gap-2 items-center">
                  <span className="text-white/80">Status:</span>
                  {selectedStatuses.map((s) => (
                    <Badge
                      key={`sel-s-${s}`}
                      variant="secondary"
                      className="bg-slate-500/20 text-white px-2 py-1 rounded-lg"
                      title={statusExplanation(s)}
                    >
                      <span className="mr-1 inline-flex items-center gap-1">
                        <StatusIcon status={s} className="text-sm" />
                        <span>{statusLabel(s)}</span>
                      </span>
                      <button
                        type="button"
                        aria-label={`Remove ${s}`}
                        className="ml-1 text-white/80 hover:text-white badge-close"
                        onClick={() => setSelectedStatuses((prev) => prev.filter((x) => x !== s))}
                      >
                        ×
                      </button>
                    </Badge>
                  ))}
                </div>
              )}
              {(minDifficulty > 800 || maxDifficulty < 3500) && (
                <span className="px-2 py-1 bg-amber-500/20 text-white rounded-lg">
                  Difficulty: {minDifficulty}-{maxDifficulty}
                </span>
              )}
              <span className="text-white/70">
                ({sorted.length} problem{sorted.length !== 1 ? 's' : ''} found)
              </span>
        <Button
                onClick={() => {
                  setSearchTerm("");
                  setSelectedTags([]);
          setSelectedStatuses([]);
                  setMinDifficulty(800);
                  setMaxDifficulty(3500);
                  setMinDifficultyInput("800");
                  setMaxDifficultyInput("3500");
          setTagPanelOpen(false);
          setStatusPanelOpen(false);
                }}
                className="ml-auto px-3 py-1 text-white text-xs border-none shadow-none filter-clear-btn"
              >
                Clear All
              </Button>
            </div>
          )}

          {/* Divider */}
          <div className="h-px bg-slate-800/60 rounded my-6" />

          {/* Table */}
          <Card className="glass-card overflow-hidden mt-8">
            <div className="stable-table-container">
              {loading ? (
                <div className="flex items-center justify-center p-12">
                  <div className="flex items-center space-x-3">
                    <div className="loading-spinner w-6 h-6"></div>
                    <span className="text-white/80">Loading problems...</span>
                  </div>
                </div>
              ) : error ? (
                <div className="flex items-center justify-center p-12">
                  <div className="text-center">
                    <p className="text-red-400 mb-2">Failed to load problems</p>
                    <p className="text-white/70 text-sm">{error}</p>
                  </div>
                </div>
              ) : sorted.length === 0 ? (
                <div className="flex items-center justify-center p-12">
                  <p className="text-white/80">No problems found</p>
                </div>
              ) : (
                <table className="w-full table-fixed">
                  <thead>
                    <tr className="border-b border-slate-700/50">
                      <th className="sticky top-0 z-10 bg-slate-950/80 backdrop-blur supports-[backdrop-filter]:bg-slate-950/60 text-center p-6 pl-2 text-sm font-medium text-white/80 uppercase tracking-wide w-20">Status</th>
                      <th className="sticky top-0 z-10 bg-slate-950/80 backdrop-blur supports-[backdrop-filter]:bg-slate-950/60 text-left p-6 text-sm font-medium text-white/80 uppercase tracking-wide w-auto">Problem</th>
                      <th
                        className="sticky top-0 z-10 bg-slate-950/80 backdrop-blur supports-[backdrop-filter]:bg-slate-950/60 text-center p-6 text-sm font-medium text-white/80 uppercase tracking-wide cursor-pointer select-none w-24"
                        onClick={()=>setSortDir(d => d === "asc" ? "desc" : "asc")}
                        title={`Sort by difficulty (${sortDir === "asc" ? "Easy → Hard" : "Hard → Easy"})`}
                      >
                        <span className="inline-flex items-center gap-2 justify-center">
                          Difficulty
                          {sortDir === "asc" ? <ChevronUp className="w-4 h-4 text-white/70" /> : <ChevronDown className="w-4 h-4 text-white/70" />}
                        </span>
                      </th>
                      <th className="sticky top-0 z-10 bg-slate-950/80 backdrop-blur supports-[backdrop-filter]:bg-slate-950/60 text-left p-6 text-sm font-medium text-white/80 uppercase tracking-wide w-64">Tags</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-700/50">
                    {paginatedProblems.map((p) => {
                      const st: Status = statusMap[p.id] || "none";
                      return (
                        <tr key={p.id} className="odd:bg-slate-900/10 even:bg-slate-900/5 hover:bg-slate-800/40 transition-colors group h-16">
                          {/* Status */}
                          <td className="p-6 pl-2 w-20 align-middle text-center">
                            <div className="flex items-center justify-center">
                              <span className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-slate-800/60 border border-slate-700/60 shadow-sm hover:ring-1 hover:ring-blue-500/40 transition">
                                <StatusIcon status={st} />
                              </span>
                            </div>
                          </td>

                          {/* Problem */}
                          <td className="p-6 w-auto align-middle">
                            <Link
                              href={`/problems/${p.contestId}/${p.index}`}
                              className="text-white hover:text-blue-400 transition-colors font-medium group-hover:text-blue-400 block truncate"
                              title="Open the problem"
                              onClick={()=>setStatus(p.id, "viewed")}
                            >
                              {p.contestId}{p.index}. {p.name}
                            </Link>
                          </td>

                          {/* Difficulty */}
              <td className="p-4 w-24 align-middle text-center">
                            <span
                className={`inline-block px-2 py-0.5 rounded-md text-xs font-medium rating-heat shadow-sm my-1 ${ratingHeatClass(p.rating)}`}
                              title={`Rating ${p.rating} (${ratingBand(p.rating)} • 800 easiest → 3500 hardest)`}
                              aria-label={`Rating ${p.rating} ${ratingBand(p.rating)}`}
                            >
                              {p.rating}
                            </span>
                          </td>

                          {/* Tags */}
                          <td className="p-6 w-64 align-middle">
                            <div className="flex flex-wrap gap-1.5 overflow-hidden max-h-12">
                              {p.tags.map(tag => (
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
              )}
            </div>
          </Card>

          {/* Pagination Controls */}
          {sorted.length > 0 && (
            <div className="flex items-center justify-between mt-6">
              <div className="text-sm text-white/80">
                Showing <span className="text-white font-medium">{startIndex + 1}</span> to <span className="text-white font-medium">{Math.min(endIndex, sorted.length)}</span> of <span className="text-white font-medium">{sorted.length.toLocaleString()}</span> problems
              </div>
              
              <div className="flex items-center space-x-2">
                <Button
                  onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                  disabled={currentPage === 1}
                  className="bg-transparent !text-white border-none shadow-none hover:bg-slate-800/40 disabled:opacity-50 disabled:cursor-not-allowed focus-visible:ring-0 focus:ring-0 focus:outline-none active:ring-0 pagination-btn"
                >
                  <ChevronUp className="w-4 h-4 rotate-[-90deg]" />
                  Previous
                </Button>
                
                <div className="flex items-center space-x-1">
                  {currentPage > 3 && totalPages > 5 && (
                    <>
                      <Button
                        onClick={() => setCurrentPage(1)}
                        className="w-10 h-10 p-0 bg-transparent !text-white border-none shadow-none hover:bg-slate-800/40 focus-visible:ring-0 focus:ring-0 focus:outline-none active:ring-0 pagination-btn"
                      >
                        1
                      </Button>
                      {currentPage > 4 && <span className="text-white/70 px-2">...</span>}
                    </>
                  )}
                  
                  {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                    let pageNum;
                    if (totalPages <= 5) pageNum = i + 1;
                    else if (currentPage <= 3) pageNum = i + 1;
                    else if (currentPage >= totalPages - 2) pageNum = totalPages - 4 + i;
                    else pageNum = currentPage - 2 + i;
                    
                    return (
                      <Button
                        key={pageNum}
                        onClick={() => setCurrentPage(pageNum)}
                        className={`w-10 h-10 p-0 bg-transparent !text-white border-none shadow-none focus-visible:ring-0 focus:ring-0 focus:outline-none active:ring-0 pagination-btn ${
                          currentPage === pageNum ? "pagination-active" : ""
                        }`}
                      >
                        {pageNum}
                      </Button>
                    );
                  })}
                  
                  {currentPage < totalPages - 2 && totalPages > 5 && (
                    <>
                      {currentPage < totalPages - 3 && <span className="text-white/70 px-2">...</span>}
                      <Button
                        onClick={() => setCurrentPage(totalPages)}
                        className="w-10 h-10 p-0 bg-transparent !text-white border-none shadow-none hover:bg-slate-800/40 focus-visible:ring-0 focus:ring-0 focus:outline-none active:ring-0 pagination-btn"
                      >
                        {totalPages}
                      </Button>
                    </>
                  )}
                </div>
                
                <Button
                  onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                  disabled={currentPage === totalPages}
                  className="bg-transparent !text-white border-none shadow-none hover:bg-slate-800/40 disabled:opacity-50 disabled:cursor-not-allowed focus-visible:ring-0 focus:ring-0 focus:outline-none active:ring-0 pagination-btn"
                >
                  Next
                  <ChevronUp className="w-4 h-4 rotate-[90deg]" />
                </Button>
              </div>
              
              <div className="text-sm text-white/80">
                Page <span className="text-white font-medium">{currentPage}</span> of <span className="text-white font-medium">{totalPages.toLocaleString()}</span>
                <div className="text-xs text-white/60 mt-1">Use ← → keys to navigate</div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
