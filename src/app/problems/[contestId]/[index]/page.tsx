/* eslint-disable @typescript-eslint/no-explicit-any */
import ProblemEditor from '@/components/ProblemEditor';
import { headers } from 'next/headers';
import Link from 'next/link';

// Helper to build Codeforces-like ID string used in your JSONs, e.g. "306/A"
function makeKey(contestId: string | number, index: string) {
  return `${contestId}/${index}`;
}

async function getProblemData(contestId: string, index: string) {
  const hdrs = await headers();
  const DATA_BASE = (process.env.NEXT_PUBLIC_DATA_BASE_URL || "").replace(/\/$/, "");
  const proto = hdrs.get('x-forwarded-proto') ?? 'http';
  const host = hdrs.get('host') ?? 'localhost:3000';
  const localBase = `${proto}://${host}`;
  const base = DATA_BASE || localBase;
  // Fetch the problem list (for metadata like name, rating, tags)
  const problemsRes = await fetch(`${base}${DATA_BASE ? '' : ''}/data/problemset_complete.json`.replace(/\/+data\//, '/data/'), { cache: 'no-store' });
  if (!problemsRes.ok) throw new Error(`Failed to load problemset (${problemsRes.status})`);
  const problems = await problemsRes.json();

  const meta = (problems as any[]).find(p => String(p.contestId) === String(contestId) && String(p.index) === String(index));

  // Fetch descriptions map
  const descRes = await fetch(`${base}${DATA_BASE ? '' : ''}/data/descriptions.json`.replace(/\/+data\//, '/data/'), { cache: 'no-store' });
  if (!descRes.ok) throw new Error(`Failed to load descriptions (${descRes.status})`);
  const descriptions = await descRes.json();
  const key = makeKey(contestId, index);
  const descEntry = descriptions[key] || {};

  // Compose editor-friendly problem data
  // Normalize fields from descriptions.json
  const statement: string | undefined = (descEntry.description as string) || (descEntry.note as string) || undefined;
  const hint: string | undefined = (descEntry.note as string) || undefined;
  const constraintsObj = (descEntry.constraints as any) || undefined;
  const constraints: string[] = [];
  if (constraintsObj && typeof constraintsObj === 'object') {
    if (constraintsObj.input_format) constraints.push(`Input: ${constraintsObj.input_format}`);
    if (constraintsObj.output_format) constraints.push(`Output: ${constraintsObj.output_format}`);
    if (constraintsObj.interaction_format) constraints.push(`Interaction: ${constraintsObj.interaction_format}`);
  }
  const examplesArr = Array.isArray(descEntry.examples) ? descEntry.examples as Array<any> : [];
  const examples = examplesArr.map(ex => ({
    input: String(ex.input ?? ''),
    output: String(ex.output ?? ''),
    explanation: typeof ex.explanation === 'string' ? ex.explanation : undefined,
  }));

  const problem = {
    id: meta?.id || key,
    name: meta?.name || `${contestId}${index}`,
    rating: meta?.rating,
    difficulty: undefined as string | undefined,
    tags: meta?.tags || [],
    statement: statement || 'No description available.',
    examples,
    constraints,
    hint,
    companies: [] as string[],
    acceptance: undefined as number | undefined,
    totalSubmissions: undefined as string | number | undefined,
  };

  return problem;
}

export default async function ProblemPage({ params }: { params: Promise<{ contestId: string; index: string }> }) {
  const { contestId, index } = await params;
  try {
    const problem = await getProblemData(contestId, index);
  // Mark as viewed client-side after hydration (ProblemEditor will perform the call via effect)
  return <ProblemEditor problem={problem} />;
  } catch (e) {
    const message = e instanceof Error ? e.message : 'Failed to load problem';
    // Fallback minimal page with error
    return (
      <div className="min-h-screen bg-slate-950 text-white flex items-center justify-center p-8">
        <div className="max-w-xl text-center">
          <h1 className="text-2xl font-semibold mb-2">Unable to load problem</h1>
          <p className="text-white/80 mb-6">{message}</p>
          <Link href="/problems" className="text-blue-400 underline">Back to Problem Set</Link>
        </div>
      </div>
    );
  }
}
