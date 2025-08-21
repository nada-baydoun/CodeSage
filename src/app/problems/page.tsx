"use client";
import React, { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { 
  Search, 
  Filter, 
  Code2, 
  Timer, 
  Trophy, 
  User, 
  Settings, 
  ChevronRight,
  Star,
  Clock,
  TrendingUp,
  BookOpen,
  Target,
  Zap
} from "lucide-react";
import Link from "next/link";

const problems = [
  {
    id: 1,
    title: "Two Sum",
    difficulty: "Easy",
    acceptance: 51.3,
    frequency: 4.8,
    tags: ["Array", "Hash Table"],
    companies: ["Amazon", "Google", "Microsoft"],
    premium: false,
    solved: true
  },
  {
    id: 2,
    title: "Add Two Numbers",
    difficulty: "Medium",
    acceptance: 38.9,
    frequency: 4.2,
    tags: ["Linked List", "Math", "Recursion"],
    companies: ["Facebook", "Apple", "Netflix"],
    premium: false,
    solved: false
  },
  {
    id: 3,
    title: "Longest Substring Without Repeating Characters",
    difficulty: "Medium",
    acceptance: 33.8,
    frequency: 4.5,
    tags: ["Hash Table", "String", "Sliding Window"],
    companies: ["Amazon", "Microsoft", "Adobe"],
    premium: false,
    solved: false
  },
  {
    id: 4,
    title: "Median of Two Sorted Arrays",
    difficulty: "Hard",
    acceptance: 35.4,
    frequency: 3.9,
    tags: ["Array", "Binary Search", "Divide and Conquer"],
    companies: ["Google", "Amazon", "Facebook"],
    premium: true,
    solved: false
  },
  {
    id: 5,
    title: "Longest Palindromic Substring",
    difficulty: "Medium",
    acceptance: 32.1,
    frequency: 4.1,
    tags: ["String", "Dynamic Programming"],
    companies: ["Amazon", "Microsoft", "Apple"],
    premium: false,
    solved: false
  },
  {
    id: 6,
    title: "ZigZag Conversion",
    difficulty: "Medium",
    acceptance: 42.7,
    frequency: 2.8,
    tags: ["String"],
    companies: ["Amazon", "Facebook"],
    premium: false,
    solved: false
  },
  {
    id: 7,
    title: "Reverse Integer",
    difficulty: "Medium",
    acceptance: 26.9,
    frequency: 3.2,
    tags: ["Math"],
    companies: ["Apple", "Amazon"],
    premium: false,
    solved: false
  },
  {
    id: 8,
    title: "String to Integer (atoi)",
    difficulty: "Medium",
    acceptance: 16.5,
    frequency: 3.0,
    tags: ["String"],
    companies: ["Amazon", "Microsoft", "Facebook"],
    premium: false,
    solved: false
  },
];

const getDifficultyColor = (difficulty: string) => {
  switch (difficulty.toLowerCase()) {
    case 'easy': return 'badge-easy';
    case 'medium': return 'badge-medium';
    case 'hard': return 'badge-hard';
    default: return 'badge-tag';
  }
};

const getFrequencyColor = (frequency: number) => {
  if (frequency >= 4.5) return 'text-red-400';
  if (frequency >= 4.0) return 'text-orange-400';
  if (frequency >= 3.5) return 'text-yellow-400';
  return 'text-green-400';
};

export default function ProblemsPage() {
  const [searchTerm, setSearchTerm] = useState("");
  const [difficultyFilter, setDifficultyFilter] = useState("All");
  const [statusFilter, setStatusFilter] = useState("All");

  const filteredProblems = problems.filter(problem => {
    const matchesSearch = problem.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         problem.tags.some(tag => tag.toLowerCase().includes(searchTerm.toLowerCase()));
    const matchesDifficulty = difficultyFilter === "All" || problem.difficulty === difficultyFilter;
    const matchesStatus = statusFilter === "All" || 
                         (statusFilter === "Solved" && problem.solved) ||
                         (statusFilter === "Unsolved" && !problem.solved);
    
    return matchesSearch && matchesDifficulty && matchesStatus;
  });

  return (
    <div className="min-h-screen bg-slate-950">
      {/* Navigation Header */}
      <header className="sticky top-0 z-50 border-b border-slate-800/50 glass-nav">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            {/* Logo & Navigation */}
            <div className="flex items-center space-x-8">
              <Link href="/" className="flex items-center space-x-3">
                <div className="w-8 h-8 bg-gradient-to-r from-blue-500 to-purple-600 rounded-lg flex items-center justify-center">
                  <Code2 className="w-5 h-5 text-white" />
                </div>
                <span className="text-xl font-bold gradient-text">CodeSage</span>
              </Link>
              
              <nav className="hidden md:flex space-x-6">
                <a href="/problems" className="text-blue-400 font-medium text-sm uppercase tracking-wide">
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
              <Button className="bg-slate-800/50 hover:bg-slate-700/50 text-slate-300 border border-slate-700/50">
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

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-6 py-8">
        {/* Header Section */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h1 className="text-4xl font-bold gradient-text mb-3">Problem Set</h1>
              <p className="text-slate-400 text-lg">
                Master algorithms and data structures with our curated collection
              </p>
            </div>
            
            <div className="flex items-center space-x-4">
              <Button className="btn-secondary">
                <BookOpen className="w-4 h-4 mr-2" />
                Study Plans
              </Button>
              <Button className="btn-primary">
                <Zap className="w-4 h-4 mr-2" />
                Premium
              </Button>
            </div>
          </div>

          {/* Enhanced Analytics - All on One Line */}
          <div className="flex flex-wrap gap-4 mb-8">
            <Card className="glass-card p-4 flex-1 min-w-[200px] hover-lift group">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 bg-gradient-to-r from-blue-500/30 to-purple-500/30 rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform">
                  <Target className="w-5 h-5 text-blue-400" />
                </div>
                <div>
                  <div className="text-2xl font-bold bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent">2,847</div>
                  <div className="text-xs text-slate-400 uppercase tracking-wider">Total Problems</div>
                </div>
              </div>
            </Card>
            
            <Card className="glass-card p-4 flex-1 min-w-[200px] hover-lift group">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 bg-gradient-to-r from-emerald-500/30 to-teal-500/30 rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform">
                  <Trophy className="w-5 h-5 text-emerald-400" />
                </div>
                <div>
                  <div className="text-2xl font-bold bg-gradient-to-r from-emerald-400 to-teal-400 bg-clip-text text-transparent">1</div>
                  <div className="text-xs text-slate-400 uppercase tracking-wider">Solved</div>
                </div>
              </div>
            </Card>
            
            <Card className="glass-card p-4 flex-1 min-w-[200px] hover-lift group">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 bg-gradient-to-r from-purple-500/30 to-pink-500/30 rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform">
                  <TrendingUp className="w-5 h-5 text-purple-400" />
                </div>
                <div>
                  <div className="text-2xl font-bold bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent">85%</div>
                  <div className="text-xs text-slate-400 uppercase tracking-wider">Success Rate</div>
                </div>
              </div>
            </Card>
            
            <Card className="glass-card p-4 flex-1 min-w-[200px] hover-lift group">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 bg-gradient-to-r from-amber-500/30 to-orange-500/30 rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform">
                  <Clock className="w-5 h-5 text-amber-400" />
                </div>
                <div>
                  <div className="text-2xl font-bold bg-gradient-to-r from-amber-400 to-orange-400 bg-clip-text text-transparent">12</div>
                  <div className="text-xs text-slate-400 uppercase tracking-wider">Day Streak</div>
                </div>
              </div>
            </Card>
          </div>

          {/* Problemset Title */}
          <div className="mb-6">
            <h2 className="text-3xl font-bold gradient-text">Problemset</h2>
            <p className="text-slate-400 mt-2">Choose your challenge and start solving</p>
          </div>

        {/* Enhanced Filters and Search */}
        <Card className="glass-card p-8 mb-8 relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-r from-blue-500/5 to-purple-500/5"></div>
          <div className="relative z-10">
            <div className="flex flex-row gap-4 items-end">
              {/* Enhanced Search - Takes most space */}
              <div className="flex-1">
                <label className="block text-sm font-medium text-slate-300 mb-3">Search Problems</label>
                <div className="relative">
                  <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 w-5 h-5 text-slate-400" />
                  <input
                    type="text"
                    placeholder="Search by title, tags, or company..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full pl-12 pr-6 py-4 bg-slate-800/50 border border-slate-600/50 rounded-xl text-slate-200 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50 transition-all text-lg backdrop-blur-sm"
                  />
                  {searchTerm && (
                    <div className="absolute right-4 top-1/2 transform -translate-y-1/2 text-sm text-slate-400">
                      {filteredProblems.length} found
                    </div>
                  )}
                </div>
              </div>

              {/* Difficulty Filter */}
              <div className="min-w-[160px]">
                <label className="block text-sm font-medium text-slate-300 mb-3">Difficulty</label>
                <select
                  value={difficultyFilter}
                  onChange={(e) => setDifficultyFilter(e.target.value)}
                  className="w-full px-4 py-4 bg-slate-800/50 border border-slate-600/50 rounded-xl text-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50 transition-all backdrop-blur-sm"
                  title="Filter by difficulty level"
                >
                  <option value="All">All Levels</option>
                  <option value="Easy">Easy</option>
                  <option value="Medium">Medium</option>
                  <option value="Hard">Hard</option>
                </select>
              </div>

              {/* Status Filter */}
              <div className="min-w-[160px]">
                <label className="block text-sm font-medium text-slate-300 mb-3">Status</label>
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="w-full px-4 py-4 bg-slate-800/50 border border-slate-600/50 rounded-xl text-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50 transition-all backdrop-blur-sm"
                  title="Filter by completion status"
                >
                  <option value="All">All Status</option>
                  <option value="Solved">Solved</option>
                  <option value="Unsolved">To Solve</option>
                </select>
              </div>
            </div>
          </div>
        </Card>

        {/* Problems Table */}
        <Card className="glass-card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-slate-700/50">
                  <th className="text-left p-6 text-sm font-medium text-slate-400 uppercase tracking-wide">
                    Status
                  </th>
                  <th className="text-left p-6 text-sm font-medium text-slate-400 uppercase tracking-wide">
                    Problem
                  </th>
                  <th className="text-left p-6 text-sm font-medium text-slate-400 uppercase tracking-wide">
                    Difficulty
                  </th>
                  <th className="text-left p-6 text-sm font-medium text-slate-400 uppercase tracking-wide">
                    Acceptance
                  </th>
                  <th className="text-left p-6 text-sm font-medium text-slate-400 uppercase tracking-wide">
                    Frequency
                  </th>
                  <th className="text-left p-6 text-sm font-medium text-slate-400 uppercase tracking-wide">
                    Tags
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-700/50">
                {filteredProblems.map((problem) => (
                  <tr key={problem.id} className="hover:bg-slate-800/30 transition-colors group">
                    <td className="p-6">
                      <div className="w-6 h-6 rounded-full flex items-center justify-center">
                        {problem.solved ? (
                          <div className="w-5 h-5 bg-emerald-500/20 rounded-full flex items-center justify-center">
                            <div className="w-2 h-2 bg-emerald-400 rounded-full"></div>
                          </div>
                        ) : (
                          <div className="w-5 h-5 border-2 border-slate-600 rounded-full"></div>
                        )}
                      </div>
                    </td>
                    
                    <td className="p-6">
                      <div className="flex items-center space-x-3">
                        <Link 
                          href={problem.id === 1 ? "/problems/1" : "#"} 
                          className="text-slate-200 hover:text-blue-400 transition-colors font-medium group-hover:text-blue-400"
                        >
                          {problem.id}. {problem.title}
                        </Link>
                        {problem.premium && (
                          <Star className="w-4 h-4 text-amber-400" />
                        )}
                      </div>
                    </td>
                    
                    <td className="p-6">
                      <span className={`badge ${getDifficultyColor(problem.difficulty)}`}>
                        {problem.difficulty}
                      </span>
                    </td>
                    
                    <td className="p-6">
                      <span className="text-slate-300">{problem.acceptance}%</span>
                    </td>
                    
                    <td className="p-6">
                      <div className="flex items-center space-x-2">
                        <span className={`font-medium ${getFrequencyColor(problem.frequency)}`}>
                          {problem.frequency}
                        </span>
                        <div className="w-12 h-1 bg-slate-700 rounded-full overflow-hidden">
                          <div 
                            className={`h-full rounded-full transition-all ${
                              problem.frequency >= 4.5 ? 'bg-red-400 w-full' :
                              problem.frequency >= 4.0 ? 'bg-orange-400 w-4/5' :
                              problem.frequency >= 3.5 ? 'bg-yellow-400 w-3/5' : 'bg-green-400 w-2/5'
                            }`}
                          ></div>
                        </div>
                      </div>
                    </td>
                    
                    <td className="p-6">
                      <div className="flex flex-wrap gap-1">
                        {problem.tags.slice(0, 2).map((tag) => (
                          <span key={tag} className="badge badge-tag text-xs">
                            {tag}
                          </span>
                        ))}
                        {problem.tags.length > 2 && (
                          <span className="text-xs text-slate-400">
                            +{problem.tags.length - 2}
                          </span>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>

        {/* Enhanced Pagination */}
        <Card className="glass-card p-6 mt-8">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center space-x-4">
              <div className="text-sm text-slate-400">
                Showing <span className="text-slate-200 font-medium">{filteredProblems.length}</span> of <span className="text-slate-200 font-medium">{problems.length}</span> problems
              </div>
              <div className="text-xs text-slate-500">•</div>
              <div className="text-sm text-slate-400">
                Page <span className="text-slate-200 font-medium">1</span> of <span className="text-slate-200 font-medium">142</span>
              </div>
            </div>
            
            <div className="flex items-center space-x-2">
              <Button className="bg-slate-800/50 hover:bg-slate-700/50 text-slate-300 border border-slate-600/50 px-4 py-2 text-sm transition-all disabled:opacity-50" disabled>
                <ChevronRight className="w-4 h-4 mr-1 rotate-180" />
                Previous
              </Button>
              
              <div className="flex items-center space-x-1">
                <Button className="bg-gradient-to-r from-blue-500/20 to-purple-500/20 text-blue-300 border border-blue-500/30 px-3 py-2 text-sm font-medium">
                  1
                </Button>
                <Button className="bg-slate-800/50 hover:bg-slate-700/50 text-slate-300 border border-slate-600/50 px-3 py-2 text-sm transition-all">
                  2
                </Button>
                <Button className="bg-slate-800/50 hover:bg-slate-700/50 text-slate-300 border border-slate-600/50 px-3 py-2 text-sm transition-all">
                  3
                </Button>
                <div className="text-slate-500 px-2">...</div>
                <Button className="bg-slate-800/50 hover:bg-slate-700/50 text-slate-300 border border-slate-600/50 px-3 py-2 text-sm transition-all">
                  142
                </Button>
              </div>
              
              <Button className="bg-slate-800/50 hover:bg-slate-700/50 text-slate-300 border border-slate-600/50 px-4 py-2 text-sm transition-all">
                Next
                <ChevronRight className="w-4 h-4 ml-1" />
              </Button>
            </div>
          </div>
        </Card>
        </div>
      </div>
    </div>
  );
}
