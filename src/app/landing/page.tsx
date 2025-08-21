"use client";
import React from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { 
  Code2, 
  Zap, 
  Trophy, 
  Users, 
  BookOpen, 
  Target, 
  ArrowRight,
  TrendingUp,
  Play,
  User,
  Settings,
  Lightbulb
} from "lucide-react";

const features = [
  {
    icon: Code2,
    title: "Advanced Code Editor",
    description: "Monaco-powered editor with syntax highlighting, autocomplete, and real-time error detection."
  },
  {
    icon: Zap,
    title: "Instant Feedback",
    description: "Get immediate results with our fast execution engine and comprehensive test case validation."
  },
  {
    icon: Trophy,
    title: "Competitive Programming",
    description: "Participate in contests, climb leaderboards, and compete with programmers worldwide."
  },
  {
    icon: BookOpen,
    title: "Learning Paths",
    description: "Structured curriculum from basics to advanced algorithms and data structures."
  },
  {
    icon: Users,
    title: "Community Driven",
    description: "Connect with fellow programmers, share solutions, and learn from discussions."
  },
  {
    icon: Target,
    title: "Progress Tracking",
    description: "Detailed analytics to track your improvement and identify areas for growth."
  }
];

const stats = [
  { label: "Become a Coding Master", value: "50K+", icon: Target },
  { label: "Get personalised AI Assistance", value: "2M+", icon: Zap },
  { label: "Increase your critical Thinking Skills", value: "10M+", icon: Lightbulb },
  { label: "Track your progress", value: "25K+", icon: TrendingUp }
];

export default function LandingPage() {
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
                <Link href="/problems" className="text-slate-400 hover:text-blue-400 transition-colors text-sm uppercase tracking-wide">
                  Problems
                </Link>
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
              <Button className="bg-slate-800/50 hover:bg-slate-700/60 text-slate-200 border border-slate-600/50 backdrop-blur-sm transition-all duration-300 hover:border-slate-500/70 hover:shadow-lg px-5 py-2.5 rounded-xl">
                <Settings className="w-4 h-4 mr-2 text-blue-400" />
                Settings
              </Button>
              <div className="w-8 h-8 bg-gradient-to-r from-blue-500 to-purple-600 rounded-full flex items-center justify-center">
                <User className="w-4 h-4 text-white" />
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="py-20 px-6">
        <div className="max-w-7xl mx-auto text-center">
          <div className="mb-8">
            <h1 className="text-6xl md:text-7xl font-bold mb-6">
              Master <span className="gradient-text">Algorithms</span>
              <br />
              Win <span className="gradient-text-secondary">Interviews</span>
            </h1>
            <p className="text-xl md:text-2xl text-slate-400 max-w-3xl mx-auto leading-relaxed">
              The ultimate competitive programming platform with AI-powered feedback,
              real-time collaboration, and industry-standard coding environment.
            </p>
          </div>

          <div className="flex flex-col sm:flex-row gap-4 justify-center mb-12">
            <Link href="/problems">
              <Button className="btn-primary text-lg px-8 py-4">
                <Play className="w-5 h-5 mr-2" />
                Start Coding Now
                <ArrowRight className="w-5 h-5 ml-2" />
              </Button>
            </Link>
            <Button className="btn-secondary text-lg px-8 py-4">
              <BookOpen className="w-5 h-5 mr-2" />
              View Demo
            </Button>
          </div>

          {/* Quick Stats */}
          <div className="flex flex-wrap justify-center gap-8 max-w-6xl mx-auto">
            {stats.map((stat, index) => (
              <Card key={index} className={`glass-card p-8 text-center hover-lift group cursor-pointer relative overflow-hidden flex-1 min-w-[280px] max-w-[320px] transform hover:scale-110 transition-all duration-500 border-4 ${
                index === 0 ? 'border-cyan-400 bg-gradient-to-br from-cyan-500/40 to-blue-600/40 hover:from-cyan-400/60 hover:to-blue-500/60 hover:border-cyan-300 hover:shadow-2xl hover:shadow-cyan-400/50' :
                index === 1 ? 'border-lime-400 bg-gradient-to-br from-lime-500/40 to-emerald-600/40 hover:from-lime-400/60 hover:to-emerald-500/60 hover:border-lime-300 hover:shadow-2xl hover:shadow-lime-400/50' :
                index === 2 ? 'border-fuchsia-400 bg-gradient-to-br from-fuchsia-500/40 to-purple-600/40 hover:from-fuchsia-400/60 hover:to-purple-500/60 hover:border-fuchsia-300 hover:shadow-2xl hover:shadow-fuchsia-400/50' :
                'border-orange-400 bg-gradient-to-br from-orange-500/40 to-red-600/40 hover:from-orange-400/60 hover:to-red-500/60 hover:border-orange-300 hover:shadow-2xl hover:shadow-orange-400/50'
              }`}>
                {/* Vivid Background Gradient */}
                <div className={`absolute inset-0 opacity-20 group-hover:opacity-40 transition-opacity duration-500 ${
                  index === 0 ? 'bg-gradient-to-br from-cyan-300 via-blue-400 to-indigo-500' :
                  index === 1 ? 'bg-gradient-to-br from-lime-300 via-emerald-400 to-teal-500' :
                  index === 2 ? 'bg-gradient-to-br from-fuchsia-300 via-purple-400 to-violet-500' :
                  'bg-gradient-to-br from-orange-300 via-red-400 to-pink-500'
                }`}></div>
                
                {/* Bright Floating Particles */}
                <div className="absolute inset-0 overflow-hidden">
                  <div className={`absolute w-4 h-4 rounded-full opacity-80 animate-ping ${
                    index === 0 ? 'bg-cyan-300 shadow-lg shadow-cyan-300/60' :
                    index === 1 ? 'bg-lime-300 shadow-lg shadow-lime-300/60' :
                    index === 2 ? 'bg-fuchsia-300 shadow-lg shadow-fuchsia-300/60' :
                    'bg-orange-300 shadow-lg shadow-orange-300/60'
                  } top-4 right-4`}></div>
                  <div className={`absolute w-2 h-2 rounded-full opacity-60 animate-bounce ${
                    index === 0 ? 'bg-blue-200' :
                    index === 1 ? 'bg-emerald-200' :
                    index === 2 ? 'bg-purple-200' :
                    'bg-red-200'
                  } bottom-6 left-6`}></div>
                  <div className={`absolute w-3 h-3 rounded-full opacity-40 animate-pulse ${
                    index === 0 ? 'bg-indigo-300' :
                    index === 1 ? 'bg-teal-300' :
                    index === 2 ? 'bg-violet-300' :
                    'bg-pink-300'
                  } top-1/2 left-4`}></div>
                </div>
                
                <div className="relative z-10">
                  {/* Bright Glowing Icon */}
                  <div className={`w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6 group-hover:scale-125 group-hover:rotate-12 transition-all duration-500 ${
                    index === 0 ? 'bg-gradient-to-br from-cyan-400 to-blue-500 shadow-2xl shadow-cyan-400/70' :
                    index === 1 ? 'bg-gradient-to-br from-lime-400 to-emerald-500 shadow-2xl shadow-lime-400/70' :
                    index === 2 ? 'bg-gradient-to-br from-fuchsia-400 to-purple-500 shadow-2xl shadow-fuchsia-400/70' :
                    'bg-gradient-to-br from-orange-400 to-red-500 shadow-2xl shadow-orange-400/70'
                  }`}>
                    <stat.icon className="w-10 h-10 text-white drop-shadow-xl" />
                  </div>
                  
                  {/* Large Colorful Value */}
                  <div className={`text-6xl font-black mb-4 group-hover:scale-110 transition-transform duration-500 ${
                    index === 0 ? 'text-cyan-200 drop-shadow-2xl' :
                    index === 1 ? 'text-lime-200 drop-shadow-2xl' :
                    index === 2 ? 'text-fuchsia-200 drop-shadow-2xl' :
                    'text-orange-200 drop-shadow-2xl'
                  }`}>
                    {stat.value}
                  </div>
                  
                  {/* Bold White Label */}
                  <div className="text-white font-bold text-lg group-hover:text-slate-100 transition-colors duration-300">
                    {stat.label}
                  </div>
                </div>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-20 px-6 bg-gradient-to-b from-transparent to-slate-900/20">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-4xl md:text-5xl font-bold mb-6">
              Why Choose <span className="gradient-text">CodeSage</span>?
            </h2>
            <p className="text-xl text-slate-400 max-w-3xl mx-auto">
              Built for serious programmers who want to excel in competitive programming
              and technical interviews at top tech companies.
            </p>
          </div>

          <div className="grid grid-cols-3 gap-6 lg:gap-10">
            {features.map((feature, index) => (
              <Card key={index} className={`glass-card p-4 lg:p-10 hover-lift group relative overflow-hidden cursor-pointer transform hover:scale-110 transition-all duration-700 border-4 ${
                index % 3 === 0 ? 'border-sky-400 bg-gradient-to-br from-sky-500/50 to-indigo-600/50 hover:from-sky-400/70 hover:to-indigo-500/70 hover:border-sky-300 hover:shadow-2xl hover:shadow-sky-400/60' :
                index % 3 === 1 ? 'border-emerald-400 bg-gradient-to-br from-emerald-500/50 to-teal-600/50 hover:from-emerald-400/70 hover:to-teal-500/70 hover:border-emerald-300 hover:shadow-2xl hover:shadow-emerald-400/60' :
                'border-rose-400 bg-gradient-to-br from-rose-500/50 to-pink-600/50 hover:from-rose-400/70 hover:to-pink-500/70 hover:border-rose-300 hover:shadow-2xl hover:shadow-rose-400/60'
              }`}>
                {/* Bright Background Gradient */}
                <div className={`absolute inset-0 opacity-30 group-hover:opacity-50 transition-all duration-700 ${
                  index % 3 === 0 ? 'bg-gradient-to-br from-sky-400 via-blue-500 to-indigo-600' :
                  index % 3 === 1 ? 'bg-gradient-to-br from-emerald-400 via-teal-500 to-cyan-600' :
                  'bg-gradient-to-br from-rose-400 via-pink-500 to-purple-600'
                }`}></div>
                
                {/* Bright Corner Accents */}
                <div className="absolute top-0 right-0 w-32 h-32 opacity-40 group-hover:opacity-70 transition-opacity duration-500">
                  <div className={`w-full h-full rounded-bl-3xl ${
                    index % 3 === 0 ? 'bg-gradient-to-br from-sky-300 to-transparent' :
                    index % 3 === 1 ? 'bg-gradient-to-br from-emerald-300 to-transparent' :
                    'bg-gradient-to-br from-rose-300 to-transparent'
                  }`}></div>
                </div>
                
                {/* Colorful Floating Elements */}
                <div className="absolute inset-0 overflow-hidden pointer-events-none">
                  <div className={`absolute w-3 h-3 rounded-full opacity-70 animate-ping ${
                    index % 3 === 0 ? 'bg-sky-300 shadow-lg shadow-sky-300/60' :
                    index % 3 === 1 ? 'bg-emerald-300 shadow-lg shadow-emerald-300/60' :
                    'bg-rose-300 shadow-lg shadow-rose-300/60'
                  } top-3 right-8`}></div>
                  <div className={`absolute w-2 h-2 rounded-full opacity-50 animate-bounce ${
                    index % 3 === 0 ? 'bg-indigo-300' :
                    index % 3 === 1 ? 'bg-teal-300' :
                    'bg-pink-300'
                  } bottom-4 left-4`}></div>
                  <div className={`absolute w-1 h-1 rounded-full opacity-60 animate-pulse ${
                    index % 3 === 0 ? 'bg-blue-200' :
                    index % 3 === 1 ? 'bg-cyan-200' :
                    'bg-purple-200'
                  } top-1/2 left-8`}></div>
                </div>
                
                <div className="relative z-10">
                  {/* Bright Glowing Icon */}
                  <div className={`w-8 h-8 lg:w-20 lg:h-20 rounded-xl lg:rounded-full flex items-center justify-center mb-3 lg:mb-6 group-hover:scale-125 group-hover:rotate-12 transition-all duration-700 ${
                    index % 3 === 0 ? 'bg-gradient-to-br from-sky-400 to-indigo-500 shadow-2xl shadow-sky-400/70' :
                    index % 3 === 1 ? 'bg-gradient-to-br from-emerald-400 to-teal-500 shadow-2xl shadow-emerald-400/70' :
                    'bg-gradient-to-br from-rose-400 to-pink-500 shadow-2xl shadow-rose-400/70'
                  }`}>
                    <feature.icon className="w-4 h-4 lg:w-10 lg:h-10 text-white drop-shadow-xl" />
                  </div>
                  
                  {/* Bright Colorful Title */}
                  <h3 className={`text-sm lg:text-2xl font-bold mb-2 lg:mb-4 group-hover:scale-105 transition-all duration-500 ${
                    index % 3 === 0 ? 'text-sky-100 drop-shadow-lg' :
                    index % 3 === 1 ? 'text-emerald-100 drop-shadow-lg' :
                    'text-rose-100 drop-shadow-lg'
                  }`}>
                    {feature.title}
                  </h3>
                  
                  {/* Enhanced Description */}
                  <p className="text-slate-100 group-hover:text-white leading-relaxed text-xs lg:text-lg transition-colors duration-500 font-medium">
                    {feature.description}
                  </p>
                </div>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-slate-800/50 py-8 px-6">
        <div className="max-w-7xl mx-auto text-center">
          <div className="flex items-center justify-center space-x-3 mb-4">
            <div className="w-8 h-8 bg-gradient-to-r from-blue-500 to-purple-600 rounded-lg flex items-center justify-center">
              <Code2 className="w-5 h-5 text-white" />
            </div>
            <span className="text-xl font-bold gradient-text">CodeSage</span>
          </div>
          <p className="text-slate-400 text-sm">
            &copy; 2025 CodeSage. All rights reserved.
          </p>
        </div>
      </footer>
    </div>
  );
}
