import { NextResponse } from "next/server";
import OpenAI from "openai";
import { env } from "@/config/env";
import fs from "node:fs/promises";
import path from "node:path";
import { URL } from "node:url";

type FullHintRequest = {
  language?: string;
  snippet?: string;
  problem?: { id?: string; name?: string; statement?: string; tags?: string[] };
  includeResources?: boolean;
  categories?: string[];
  reason?: string;
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
    const body = (await req.json()) as FullHintRequest;
  const language = body.language || "python";
  const snippet = (body.snippet || "").toString();
  const includeResources = Boolean((body as any)?.includeResources);
  const problemId = body.problem?.id || "";
    const problemName = body.problem?.name || "";
    const problemStatement = body.problem?.statement || "";
  const problemTagsFromClient: string[] = Array.isArray(body.problem?.tags) ? (body.problem!.tags as string[]) : [];
  const categories: string[] = Array.isArray((body as any)?.categories) ? (body as any).categories : [];
  const reason: string = typeof (body as any)?.reason === 'string' ? (body as any).reason : '';

    if (!snippet.trim()) {
      return NextResponse.json({ description: "", failure: "" }, { status: 200 });
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

  const sys = [
      "You are a helpful competitive programming coach.",
      includeResources
        ? "Study the ENTIRE submission and output STRICT JSON: { description: string, failure: string, resources: { youtube: { title: string, url: string }, webpage: { title: string, url: string } } }."
        : "Study the ENTIRE submission and output ONLY these fields as strict JSON: { description: string, failure: string }.",
      "description: a concise description of what the user's code is doing (1-2 lines).",
      "failure: a minimal explanation of what went wrong or is likely wrong (1-2 lines).",
      "Do not reveal the answer or exact fix; do not give explicit code or exact algorithm steps. Avoid 'return X' / 'replace with' / 'do this:'.",
      includeResources
    ? "resources: recommend exactly one YouTube video and one webpage (general article or tutorial) that help learn the concepts related to the observed failure; ensure valid URLs and meaningful titles."
        : "",
      "Use the thinking steps and correct-solution variants as context, but never quote them as the solution.",
    ].filter(Boolean).join(" \n");

    const userSections: string[] = [];
    if (problemName) userSections.push(`Problem: ${problemName}`);
    if (problemStatement) userSections.push(`Problem description (truncated): ${problemStatement.slice(0, 1400)}`);
    if (psItem) userSections.push(`Problem meta (without name): ${JSON.stringify(psForReport).slice(0, 1000)}`);
    if (thinking1) userSections.push(`Thinking_steps[0]: ${thinking1}`);
    if (checkerVariants.length) userSections.push(`checker1 variants (truncated):\n${checkerVariants.map(s => s.slice(0, 600)).join("\n---\n")}`);
    userSections.push(`Full code (${language}) to analyze:\n${snippet.slice(0, 25000)}`);

    const user = userSections.join("\n\n");

  let jsonText = "";
    try {
      const r = await openai.responses.create({
        model: "gpt-4o-mini",
        input: [
          { role: "system", content: sys },
          { role: "user", content: user },
        ],
        max_output_tokens: 220,
      } as any);
      jsonText = (r as any)?.output?.[0]?.content?.[0]?.text || "";
    } catch {
      const r = await openai.chat.completions.create({
        model: "gpt-4o-mini",
        messages: [
          { role: "system", content: sys },
          { role: "user", content: user },
        ],
        max_tokens: 220,
        temperature: 0.0,
      });
      jsonText = r.choices?.[0]?.message?.content || "";
    }

    const match = jsonText.match(/\{[\s\S]*\}/);
    const jsonClean = match ? match[0] : jsonText;
    let parsed: any = {};
    try { parsed = JSON.parse(jsonClean); } catch { parsed = { description: "", failure: "" }; }

  let description: string = (parsed?.description ?? "").toString();
  let failure: string = (parsed?.failure ?? "").toString();
  let resources: any = parsed?.resources ?? null;

    const sanitize = (s: string, limit = 300) => {
      let t = s.replace(/\r?\n/g, " ").trim();
      if (t.length > limit) t = t.slice(0, limit - 3) + "...";
      const lower = t.toLowerCase();
      if (/the answer is|use exactly|replace with|do this:/.test(lower)) return "";
      return t;
    };

    description = sanitize(description, 260);
    failure = sanitize(failure, 260);

    // Sanitize resources from LLM (temporary holder)
    if (!includeResources) {
      resources = null;
    }

    // Helper: naive HTML entity decode
    const decodeHtml = (s: string) => s
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&quot;/g, '"')
      .replace(/&#39;/g, "'");

    // Helper: sanitize titles coming from search
    const sanitizeTitle = (raw: string, fallback: string): string => {
      if (!raw || typeof raw !== 'string') return fallback;
      let t = decodeHtml(raw)
        .replace(/<[^>]*>/g, '')
        .replace(/\s+/g, ' ')
        .trim();
      // Drop common suffixes and separators
      t = t.replace(/\s*-\s*YouTube$/i, '').trim();
      if (t.includes('|')) t = t.split('|')[0].trim();
      // Remove leading/trailing brackets-only decorations
      t = t.replace(/^\[[^\]]*\]\s*/g, '').replace(/\s*\[[^\]]*\]$/g, '');
      // Guard length and emptiness
      if (!t || t.length < 3) return fallback;
      if (t.length > 120) t = t.slice(0, 117) + '...';
      return t;
    };

  // Helper: fetch DuckDuckGo HTML results and parse anchor links; optional host allow/deny
    async function ddgSearch(query: string, max: number = 6, allowHosts?: string[], denyHosts?: string[]): Promise<Array<{ url: string; title: string }>> {
      const q = encodeURIComponent(query);
      const resp = await fetch(`https://duckduckgo.com/html/?q=${q}`, { headers: { 'User-Agent': 'Mozilla/5.0 CodeSageBot' }, cache: 'no-store' });
      if (!resp.ok) return [];
      const html = await resp.text();
      const out: Array<{ url: string; title: string }> = [];
      // Extract <a class="result__a" href="...">Title</a>
      const re = /<a[^>]*class=["'][^"']*result__a[^"']*["'][^>]*href=["']([^"']+)["'][^>]*>([\s\S]*?)<\/a>/gi;
      let m: RegExpExecArray | null;
      while ((m = re.exec(html)) && out.length < max) {
        const href = decodeHtml(m[1]);
        const title = decodeHtml(m[2].replace(/<[^>]*>/g, '').trim());
        if (!/^https?:\/\//i.test(href)) continue;
        try {
          const u = new URL(href);
          const host = u.hostname.toLowerCase();
          if (denyHosts && denyHosts.some(h => host.includes(h))) continue;
          if (allowHosts && allowHosts.length && !allowHosts.some(h => host.includes(h))) continue;
          out.push({ url: href, title });
        } catch { continue; }
      }
      return out;
    }

    // Optional: AI Web Search (Tavily) if API key is available
    async function tavilySearch(query: string, max: number = 6, allowHosts?: string[], denyHosts?: string[]): Promise<Array<{ url: string; title: string }>> {
      if (!env.TAVILY_API_KEY) return [];
      try {
        const resp = await fetch('https://api.tavily.com/search', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${env.TAVILY_API_KEY}` },
          body: JSON.stringify({ query, max_results: Math.min(max, 10) })
        });
        if (!resp.ok) return [];
        const data = await resp.json();
        let results: Array<{ url: string; title: string }> = Array.isArray(data?.results) ? data.results.map((r: any) => ({ url: String(r.url || ''), title: String(r.title || '') })) : [];
        results = results.filter(r => {
          if (!/^https?:\/\//i.test(r.url)) return false;
          try {
            const u = new URL(r.url);
            const host = u.hostname.toLowerCase();
            if (denyHosts && denyHosts.some(h => host.includes(h))) return false;
            if (allowHosts && allowHosts.length && !allowHosts.some(h => host.includes(h))) return false;
            return true;
          } catch { return false; }
        });
        return results;
      } catch { return []; }
    }

    // Build resource topics using ONLY tags + error categories (per product requirement)
    const allTags: string[] = Array.isArray(psItem?.tags)
      ? (psItem!.tags as string[])
      : problemTagsFromClient;

    const tagToKeywords = (tag: string): string => {
      const t = (tag || '').toLowerCase();
      switch (t) {
        case 'binary search': return 'binary search sorted arrays bounds lower_bound upper_bound';
        case 'ternary search': return 'ternary search unimodal function optimization';
        case 'two pointers': return 'two pointers sliding window subarray problems';
        case 'brute force': return 'brute force enumeration pruning complexity';
        case 'data structures': return 'stacks queues heaps hashing sets maps';
        case 'dynamic programming': return 'dynamic programming dp states transitions memoization tabulation';
        case 'graphs': return 'graphs bfs dfs graph traversal adjacency list';
        case 'graph matchings': return 'graph matching bipartite matching hopcroft karp';
        case 'shortest paths': return 'shortest paths dijkstra bellman ford bfs 0-1';
        case 'depth-first search': return 'dfs recursion stack tree traversal';
        case 'breadth-first search': return 'bfs queue shortest layers';
        case 'disjoint set union': return 'disjoint set union dsu union find path compression';
        case 'math': return 'math modular arithmetic combinatorics number properties';
        case 'number theory': return 'number theory gcd lcm primes sieve modular inverse';
        case 'combinatorics': return 'combinatorics nCr permutations counting';
        case 'greedy': return 'greedy algorithm exchange argument proof';
        case 'divide and conquer': return 'divide and conquer recursion recurrence';
        case 'constructive algorithms': return 'constructive algorithms pattern construction';
        case 'strings': return 'strings prefix function kmp z-function hashing';
        case 'bitmasks': return 'bitmasks subset dp bit operations';
        case 'implementation': return 'implementation careful coding edge cases';
        case 'hashing': return 'string hashing polynomial rolling hash collisions';
        case 'sortings': return 'sorting algorithms comparator stability';
        case 'geometry': return 'computational geometry orientation ccw cross product';
        case 'probabilities': return 'probability expected value dp';
        case 'interactive': return 'interactive problems protocol queries';
        case 'trees': return 'trees traversal lca binary tree';
        default:
          return t.replace(/\s+/g, ' ');
      }
    };

    const categoryToKeywords = (cat: string): string => {
      const c = (cat || '').toLowerCase();
      switch (c) {
        case 'syntax': return 'syntax errors debugging common mistakes';
        case 'logical': return 'logic errors off-by-one edge cases testing strategies';
        case 'runtime': return language.toLowerCase().includes('python')
          ? 'python runtime errors exceptions index out of range typeerror'
          : 'runtime errors exceptions debugging';
        case 'tle': return 'time complexity optimization big o faster algorithms';
        case 'missing_concept': return 'learn concepts fundamentals step by step';
        case 'knowledge_gap': return language.toLowerCase().includes('python')
          ? 'python language basics io loops lists dicts'
          : 'programming language basics';
        default: return '';
      }
    };

    const tagKeywords = (allTags || []).slice(0, 3).map(tagToKeywords).filter(Boolean).join(' ');
    const catKeywords = (categories || []).slice(0, 3).map(categoryToKeywords).filter(Boolean).join(' ');
    const eduQualifier = 'competitive programming tutorial guide';
    const baseQuery = [tagKeywords, catKeywords, eduQualifier].filter(Boolean).join(' ').trim() || 'competitive programming basics tutorial';

    // Whitelists for high-quality educational content
  const allowedWebHosts = [
      'cp-algorithms.com',
      'usaco.guide',
      'topcoder.com',
      'khanacademy.org',
      'geeksforgeeks.org',
      'cses.fi',
      'brilliant.org',
      'realpython.com',
      'programiz.com',
      'blog.jetbrains.com'
    ];
    const denyHosts = ['codeforces.com'];
    const preferredYtChannels = [
      'William Fiset',
      'Errichto',
      'Tushar Roy',
      'NeetCode',
      'freeCodeCamp.org',
      'Abdul Bari'
    ];

    // Real web search for resources (avoid Codeforces domain)
    let pickedYouTube: { title: string; url: string } | null = null;
    let pickedWeb: { title: string; url: string } | null = null;
  if (includeResources) {
      try {
    // Prefer Tavily for AI web search; build channel-boosted queries first
  let ytResults: Array<{ url: string; title: string }> = [];
        for (const ch of preferredYtChannels) {
          const q = `${baseQuery} site:youtube.com ${ch}`.trim();
          const r1 = await tavilySearch(q, 6, undefined, denyHosts);
          ytResults = ytResults.concat(r1);
          if (ytResults.length) break;
          const r2 = await ddgSearch(q, 6, undefined, denyHosts);
          ytResults = ytResults.concat(r2);
          if (ytResults.length) break;
        }
        if (!ytResults.length) {
          const q = `${baseQuery} tutorial site:youtube.com`.trim();
          ytResults = await tavilySearch(q, 8, undefined, denyHosts);
          if (!ytResults.length) ytResults = await ddgSearch(q, 8, undefined, denyHosts);
        }
        for (const r of ytResults) {
          const u = new URL(r.url);
          const host = u.hostname.toLowerCase();
          if (host.includes('youtube.com') || host.includes('youtu.be')) {
            if (/codeforces\.com/i.test(r.url)) continue;
            pickedYouTube = { title: r.title || 'YouTube video', url: r.url };
            break;
          }
        }
      } catch {}
      try {
  let webResults = await tavilySearch(`${baseQuery}`, 10, allowedWebHosts, denyHosts);
  if (!webResults.length) webResults = await ddgSearch(`${baseQuery}`, 10, allowedWebHosts, denyHosts);
        for (const r of webResults) {
          const u = new URL(r.url);
          const host = u.hostname.toLowerCase();
          // Exclude Codeforces and YouTube for the webpage slot
          if (host.includes('codeforces.com') || host.includes('youtube.com') || host.includes('youtu.be')) continue;
          pickedWeb = { title: sanitizeTitle(r.title || 'Reference article', 'Reference article'), url: r.url };
          break;
        }
      } catch {}
      // Curated fallbacks if search did not produce both
      const lowerFirstTag = ((allTags || [])[0] || '').toString().toLowerCase();
      const fallbackWebByTag: Record<string, { title: string; url: string }> = {
        'binary search': { title: 'Binary Search — cp-algorithms', url: 'https://cp-algorithms.com/num_methods/binary_search.html' },
        'two pointers': { title: 'Two Pointers — USACO Guide', url: 'https://usaco.guide/silver/two-pointers' },
        'dynamic programming': { title: 'Intro to DP — USACO Guide', url: 'https://usaco.guide/gold/intro-dp' },
        'graphs': { title: 'BFS — cp-algorithms', url: 'https://cp-algorithms.com/graph/breadth-first-search.html' },
        'shortest paths': { title: 'Dijkstra — cp-algorithms', url: 'https://cp-algorithms.com/graph/dijkstra.html' },
        'disjoint set union': { title: 'DSU — cp-algorithms', url: 'https://cp-algorithms.com/data_structures/disjoint_set_union.html' },
        'strings': { title: 'Prefix Function (KMP) — cp-algorithms', url: 'https://cp-algorithms.com/string/prefix-function.html' },
        'hashing': { title: 'String Hashing — cp-algorithms', url: 'https://cp-algorithms.com/string/string-hashing.html' },
        'bitmasks': { title: 'Bitmask DP — USACO Guide', url: 'https://usaco.guide/gold/bitmask-dp' },
        'geometry': { title: 'Basic Geometry — cp-algorithms', url: 'https://cp-algorithms.com/geometry/basic-geometry.html' },
        'greedy': { title: 'Greedy — USACO Guide', url: 'https://usaco.guide/general/greedy' },
        'implementation': { title: 'Implementation Tips — USACO Guide', url: 'https://usaco.guide/general/fast-io' },
      };
      const fallbackYtByTag: Record<string, { title: string; url: string }> = {
        'binary search': { title: 'Channel: NeetCode (YouTube)', url: 'https://www.youtube.com/@NeetCode' },
        'two pointers': { title: 'Channel: NeetCode (YouTube)', url: 'https://www.youtube.com/@NeetCode' },
        'dynamic programming': { title: 'Channel: Tushar Roy (YouTube)', url: 'https://www.youtube.com/@tusharroy2525' },
        'graphs': { title: 'Channel: William Fiset (YouTube)', url: 'https://www.youtube.com/@WilliamFiset' },
        'shortest paths': { title: 'Channel: William Fiset (YouTube)', url: 'https://www.youtube.com/@WilliamFiset' },
        'disjoint set union': { title: 'Channel: William Fiset (YouTube)', url: 'https://www.youtube.com/@WilliamFiset' },
        'strings': { title: 'Channel: Errichto (YouTube)', url: 'https://www.youtube.com/@Errichto' },
        'hashing': { title: 'Channel: Errichto (YouTube)', url: 'https://www.youtube.com/@Errichto' },
        'bitmasks': { title: 'Channel: Errichto (YouTube)', url: 'https://www.youtube.com/@Errichto' },
        'geometry': { title: 'Channel: William Fiset (YouTube)', url: 'https://www.youtube.com/@WilliamFiset' },
        'greedy': { title: 'Channel: Tushar Roy (YouTube)', url: 'https://www.youtube.com/@tusharroy2525' },
        'implementation': { title: 'Channel: freeCodeCamp.org (YouTube)', url: 'https://www.youtube.com/@freecodecamp' },
        'math': { title: 'Channel: Abdul Bari (YouTube)', url: 'https://www.youtube.com/@abdul_bari' },
        'number theory': { title: 'Channel: Abdul Bari (YouTube)', url: 'https://www.youtube.com/@abdul_bari' },
        'combinatorics': { title: 'Channel: freeCodeCamp.org (YouTube)', url: 'https://www.youtube.com/@freecodecamp' },
      };

      if (!pickedWeb) {
        const fb = fallbackWebByTag[lowerFirstTag] || { title: 'Competitive Programming — USACO Guide', url: 'https://usaco.guide/' };
        pickedWeb = fb;
      }
      if (!pickedYouTube) {
        const fb = fallbackYtByTag[lowerFirstTag] || { title: 'Channel: William Fiset (YouTube)', url: 'https://www.youtube.com/@WilliamFiset' };
        pickedYouTube = fb;
      }

      // Final cleanup for titles
      if (pickedYouTube) pickedYouTube.title = sanitizeTitle(pickedYouTube.title, 'YouTube video');
      if (pickedWeb) pickedWeb.title = sanitizeTitle(pickedWeb.title, 'Reference article');

      resources = { youtube: pickedYouTube, webpage: pickedWeb };
    }

    return NextResponse.json({ description, failure, resources }, { status: 200 });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
