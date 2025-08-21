"use client";
import React, { useState, useEffect } from "react";
import { Card } from "./ui/card";
import { Button } from "./ui/button";
import Editor from "@monaco-editor/react";
import { 
  Play, 
  Send, 
  Eye, 
  EyeOff, 
  Code2, 
  Timer, 
  Trophy, 
  BookOpen, 
  Settings, 
  User, 
  ChevronRight,
  Check,
  X,
  Loader2,
  Lightbulb,
  Target,
  Zap
} from "lucide-react";

const problem = {
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
  hint: "A really brute force way would be to search for all possible pairs of numbers but that would be too slow. Again, it's best to try out brute force solutions for just for completeness. It is from these brute force solutions that you can come up with optimizations. So, if we fix one of the numbers, say x, we have to scan the entire array to find the next number y which is value - x where value is the input parameter. Can we change our array somehow so that this search becomes faster?",
  companies: ["Amazon", "Google", "Microsoft", "Apple"],
  acceptance: 51.3,
  totalSubmissions: "15.2M"
};

const initialCode = `# ${problem.name} - ${problem.difficulty}
# ${problem.statement}
#
# Examples:
# Input: nums = [2,7,11,15], target = 9
# Output: [0,1]
# Explanation: Because nums[0] + nums[1] == 9, we return [0, 1].
#
# Input: nums = [3,2,4], target = 6 
# Output: [1,2]
# Explanation: Because nums[1] + nums[2] == 6, we return [1, 2].
#
# Input: nums = [3,3], target = 6
# Output: [0,1] 
# Explanation: Because nums[0] + nums[1] == 6, we return [0, 1].
#
# Constraints:
# - 2 ≤ nums.length ≤ 10⁴
# - -10⁹ ≤ nums[i] ≤ 10⁹
# - -10⁹ ≤ target ≤ 10⁹
# - Only one valid answer exists.

from typing import List

class Solution:
    def twoSum(self, nums: List[int], target: int) -> List[int]:
        # Write your solution here
        pass
`;

export default function ProblemEditor() {
  const [code, setCode] = useState(initialCode);
  const [showHint, setShowHint] = useState(false);
  const [running, setRunning] = useState(false);
  const [results, setResults] = useState<string | null>(null);
  const [testStatuses, setTestStatuses] = useState<number[]>([]);
  const [activeTab, setActiveTab] = useState<'description' | 'editorial' | 'discussions'>('description');
  const [editorTheme, setEditorTheme] = useState('vs-dark');
  const [fontSize, setFontSize] = useState(14);

  const runCode = async () => {
    setRunning(true);
    setResults(null);
    setTestStatuses(problem.examples.map(() => 0));

    // Simulate evaluation delay
    await new Promise((res) => setTimeout(res, 1200));

    // Simulate realistic test results
    const lowered = code.toLowerCase();
    const hasImplementation = !lowered.includes("pass") && !lowered.includes("todo");
    
    const statuses = problem.examples.map((_, idx) => {
      if (!hasImplementation) return 2; // fail if no implementation
      return Math.random() > 0.3 ? 1 : 2; // 70% pass rate for demo
    });
    
    setTestStatuses(statuses);
    const passed = statuses.filter((s) => s === 1).length;
    setResults(`${passed}/${problem.examples.length} test cases passed`);
    setRunning(false);
  };

  const submitCode = () => {
    alert("🚀 Code submitted successfully! Real submission system coming soon.");
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
                onClick={() => setFontSize(fontSize === 14 ? 16 : 14)}
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
              <div className="flex items-center space-x-4">
                <h1 className="text-3xl font-bold text-slate-100">{problem.name}</h1>
                <div className="flex items-center space-x-2">
                  <span className={`badge ${getDifficultyColor(problem.difficulty)}`}>
                    {problem.difficulty}
                  </span>
                  <span className="text-slate-400 text-sm">•</span>
                  <span className="text-emerald-400 text-sm font-medium">
                    {problem.acceptance}% acceptance
                  </span>
                </div>
              </div>
              
              <div className="flex items-center space-x-6 text-sm text-slate-400">
                <div className="flex items-center space-x-2">
                  <Target className="w-4 h-4" />
                  <span>{problem.totalSubmissions} submissions</span>
                </div>
                <div className="flex items-center space-x-2">
                  <Trophy className="w-4 h-4" />
                  <span>Companies: {problem.companies.slice(0, 2).join(", ")}</span>
                </div>
              </div>

              <div className="flex flex-wrap gap-2">
                {problem.tags.map((tag) => (
                  <span key={tag} className="badge badge-tag">
                    {tag}
                  </span>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Main Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
          {/* Left Panel - Problem Description */}
          <div className="lg:col-span-2 space-y-6">
            {/* Tab Navigation */}
            <div className="glass-card p-1">
              <div className="flex space-x-1">
                {[
                  { id: 'description', label: 'Description', icon: BookOpen },
                  { id: 'editorial', label: 'Editorial', icon: Lightbulb },
                  { id: 'discussions', label: 'Discuss', icon: Trophy }
                ].map(({ id, label, icon: Icon }) => (
                  <button
                    key={id}
                    onClick={() => setActiveTab(id as any)}
                    className={`flex-1 flex items-center justify-center space-x-2 px-4 py-3 rounded-xl transition-all duration-200 ${
                      activeTab === id
                        ? 'bg-blue-500/20 text-blue-400 shadow-lg'
                        : 'text-slate-400 hover:text-slate-300 hover:bg-slate-800/50'
                    }`}
                  >
                    <Icon className="w-4 h-4" />
                    <span className="font-medium text-sm">{label}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Problem Content */}
            <Card className="glass-card p-6 space-y-6">
              {activeTab === 'description' && (
                <div className="space-y-6">
                  {/* Problem Statement */}
                  <div className="problem-content">
                    <p className="text-slate-300 leading-relaxed text-base">
                      {problem.statement}
                    </p>
                  </div>

                  {/* Examples */}
                  <div className="space-y-4">
                    <h3 className="text-lg font-semibold text-slate-100 flex items-center">
                      <Target className="w-5 h-5 mr-2 text-blue-400" />
                      Examples
                    </h3>
                    
                    <div className="space-y-4">
                      {problem.examples.map((example, i) => (
                        <div key={i} className="glass rounded-xl overflow-hidden">
                          <div className="bg-gradient-to-r from-blue-500/10 to-purple-500/10 px-4 py-3 border-b border-slate-700/50">
                            <div className="flex items-center">
                              <div className="w-2 h-2 rounded-full bg-blue-400 mr-3"></div>
                              <span className="text-sm font-medium text-slate-200">
                                Example {i + 1}
                              </span>
                            </div>
                          </div>
                          
                          <div className="p-4 space-y-3">
                            <div>
                              <div className="text-xs font-medium text-blue-400 mb-2 uppercase tracking-wide">
                                Input
                              </div>
                              <div className="code-block">
                                {example.input}
                              </div>
                            </div>
                            
                            <div>
                              <div className="text-xs font-medium text-emerald-400 mb-2 uppercase tracking-wide">
                                Output
                              </div>
                              <div className="code-block">
                                {example.output}
                              </div>
                            </div>
                            
                            {example.explanation && (
                              <div>
                                <div className="text-xs font-medium text-purple-400 mb-2 uppercase tracking-wide">
                                  Explanation
                                </div>
                                <p className="text-slate-300 text-sm">
                                  {example.explanation}
                                </p>
                              </div>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Constraints */}
                  <div className="space-y-3">
                    <h3 className="text-lg font-semibold text-slate-100 flex items-center">
                      <Settings className="w-5 h-5 mr-2 text-purple-400" />
                      Constraints
                    </h3>
                    <ul className="space-y-2">
                      {problem.constraints.map((constraint, i) => (
                        <li key={i} className="flex items-start">
                          <ChevronRight className="w-4 h-4 text-slate-500 mr-2 mt-0.5 flex-shrink-0" />
                          <code className="text-slate-300 text-sm font-mono">
                            {constraint}
                          </code>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              )}

              {activeTab === 'editorial' && (
                <div className="text-center py-12">
                  <Lightbulb className="w-12 h-12 mx-auto text-yellow-400 mb-4" />
                  <h3 className="text-lg font-semibold text-slate-200 mb-2">
                    Editorial Coming Soon
                  </h3>
                  <p className="text-slate-400">
                    Detailed solution explanations will be available soon.
                  </p>
                </div>
              )}

              {activeTab === 'discussions' && (
                <div className="text-center py-12">
                  <Trophy className="w-12 h-12 mx-auto text-purple-400 mb-4" />
                  <h3 className="text-lg font-semibold text-slate-200 mb-2">
                    Join the Discussion
                  </h3>
                  <p className="text-slate-400">
                    Community discussions and solutions coming soon.
                  </p>
                </div>
              )}
            </Card>
          </div>

          {/* Right Panel - Code Editor */}
          <div className="lg:col-span-3 space-y-6">
            {/* Enhanced Code Editor */}
            <Card className="glass-card overflow-hidden">
              {/* Editor Header with Language Selection */}
              <div className="bg-gradient-to-r from-slate-800/50 to-slate-700/50 px-6 py-4 border-b border-slate-700/50">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-4">
                    <div className="flex items-center space-x-2">
                      <Code2 className="w-5 h-5 text-blue-400" />
                      <span className="text-lg font-semibold text-slate-200">
                        Code Editor
                      </span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <span className="badge badge-tag">
                        Python 3
                      </span>
                      <select 
                        className="bg-slate-700/50 border border-slate-600/50 rounded-lg px-3 py-1 text-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/50"
                        title="Select programming language"
                      >
                        <option>Python 3</option>
                        <option>JavaScript</option>
                        <option>Java</option>
                        <option>C++</option>
                      </select>
                    </div>
                  </div>

                  <div className="flex items-center space-x-3">
                    <div className="text-sm text-slate-400">
                      Font: {fontSize}px
                    </div>
                    <Button
                      onClick={() => setFontSize(fontSize === 14 ? 16 : fontSize === 16 ? 18 : 14)}
                      className="bg-slate-700/50 hover:bg-slate-600/50 text-slate-300 border border-slate-600/50 px-3 py-2 text-sm"
                    >
                      <Settings className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </div>

              {/* Monaco Editor */}
              <div className="h-[550px] bg-slate-900/95 backdrop-blur-sm">
                <Editor
                  height="100%"
                  defaultLanguage="python"
                  value={code}
                  theme="vs-dark"
                  options={{
                    fontSize: fontSize,
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
                    scrollbar: {
                      vertical: 'auto',
                      horizontal: 'auto',
                      verticalScrollbarSize: 8,
                      horizontalScrollbarSize: 8
                    },
                    overviewRulerBorder: false,
                    lineDecorationsWidth: 0,
                    colorDecorators: true,
                    wordWrap: "on",
                    tabSize: 4,
                    insertSpaces: true,
                    automaticLayout: true
                  }}
                  onChange={(value) => setCode(value || "")}
                />
              </div>

              {/* Editor Action Buttons */}
              <div className="px-6 py-4 bg-gradient-to-r from-slate-800/30 to-slate-700/30 border-t border-slate-700/50">
                <div className="flex items-center justify-between">
                  <Button 
                    onClick={() => setShowHint(!showHint)}
                    className="bg-gradient-to-r from-yellow-500/20 to-amber-500/20 hover:from-yellow-500/30 hover:to-amber-500/30 text-yellow-300 border border-yellow-500/30 px-4 py-2 text-sm backdrop-blur-sm"
                  >
                    <Lightbulb className="w-4 h-4 mr-2" />
                    {showHint ? 'Hide Hint' : 'Get Hint'}
                  </Button>

                  <div className="flex items-center space-x-3">
                    <Button
                      onClick={runCode}
                      disabled={running}
                      className={`bg-gradient-to-r from-emerald-500/20 to-teal-500/20 hover:from-emerald-500/30 hover:to-teal-500/30 text-emerald-300 border border-emerald-500/30 px-6 py-2 text-sm backdrop-blur-sm ${running ? 'opacity-50 cursor-not-allowed' : ''}`}
                    >
                      {running ? (
                        <>
                          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                          Running...
                        </>
                      ) : (
                        <>
                          <Play className="w-4 h-4 mr-2" />
                          Run
                        </>
                      )}
                    </Button>
                    
                    <Button 
                      className="bg-gradient-to-r from-blue-500/20 to-purple-500/20 hover:from-blue-500/30 hover:to-purple-500/30 text-blue-300 border border-blue-500/30 px-6 py-2 text-sm backdrop-blur-sm" 
                      onClick={submitCode}
                    >
                      <Send className="w-4 h-4 mr-2" />
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
                          {problem.hint}
                        </p>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </Card>

            {/* Enhanced Test Results */}
            <Card className="glass-card p-8">
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
                    
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                      {problem.examples.map((example, i) => {
                        const status = testStatuses[i] ?? 0;
                        return (
                          <Card
                            key={i}
                            className={`p-4 transition-all duration-300 hover:scale-105 ${
                              status === 0 ? 'bg-slate-800/50 border-slate-600/50' :
                              status === 1 ? 'bg-emerald-500/10 border-emerald-500/30 shadow-emerald-500/20 shadow-lg' : 
                              'bg-red-500/10 border-red-500/30 shadow-red-500/20 shadow-lg'
                            }`}
                          >
                            <div className="space-y-3">
                              <div className="flex items-center justify-between">
                                <span className="text-sm font-medium text-slate-200">
                                  Test Case {i + 1}
                                </span>
                                <div className="flex items-center space-x-2">
                                  {status === 0 && <Timer className="w-4 h-4 text-slate-400" />}
                                  {status === 1 && <Check className="w-4 h-4 text-emerald-400" />}
                                  {status === 2 && <X className="w-4 h-4 text-red-400" />}
                                  <span className={`text-sm font-medium ${
                                    status === 0 ? 'text-slate-400' :
                                    status === 1 ? 'text-emerald-400' : 'text-red-400'
                                  }`}>
                                    {status === 0 ? 'Pending' :
                                     status === 1 ? '✅ Passed' : '❌ Failed'}
                                  </span>
                                </div>
                              </div>
                              
                              <div className="space-y-2 text-xs">
                                <div>
                                  <div className="text-slate-500 mb-1 font-semibold">Input:</div>
                                  <div className="code-block text-xs p-2 bg-slate-900/50">
                                    {example.input}
                                  </div>
                                </div>
                                <div>
                                  <div className="text-slate-500 mb-1 font-semibold">Expected:</div>
                                  <div className="code-block text-xs p-2 bg-slate-900/50">
                                    {example.output}
                                  </div>
                                </div>
                                {status === 1 && (
                                  <div className="mt-2 p-2 bg-emerald-500/10 rounded border border-emerald-500/20">
                                    <div className="text-emerald-400 text-xs font-semibold mb-1">✅ Status:</div>
                                    <div className="text-emerald-300 text-xs">Test passed successfully! Output matches expected result.</div>
                                  </div>
                                )}
                                {status === 2 && (
                                  <div className="mt-2 space-y-2">
                                    <div>
                                      <div className="text-red-400 mb-1 font-semibold">Your Output:</div>
                                      <div className="code-block text-xs p-2 bg-red-500/10 border border-red-500/20">
                                        Runtime Error: Solution not implemented
                                      </div>
                                    </div>
                                    <div className="p-2 bg-red-500/10 rounded border border-red-500/20">
                                      <div className="text-red-400 text-xs font-semibold mb-1">❌ Feedback:</div>
                                      <div className="text-red-300 text-xs">Please implement your solution in the twoSum method.</div>
                                    </div>
                                  </div>
                                )}
                              </div>
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
                      Click the "Run" button to execute your solution against the test cases.
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
