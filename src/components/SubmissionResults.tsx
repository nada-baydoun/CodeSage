import React from 'react'
import { Card } from './ui/card'
import { Check, X, AlertCircle, Loader2 } from 'lucide-react'
import type { SubmissionResult } from '@/lib/submissionRunner'

interface SubmissionResultsProps {
  result: SubmissionResult | null
  isLoading: boolean
  error: string | null
}

export default function SubmissionResults({ result, isLoading, error }: SubmissionResultsProps) {
  if (isLoading) {
    return (
      <Card className="glass-card p-6">
        <div className="flex items-center justify-center space-x-3 py-8">
          <Loader2 className="w-6 h-6 text-blue-400 animate-spin" />
          <span className="text-slate-300 text-lg">Running submission tests...</span>
        </div>
      </Card>
    )
  }

  if (error) {
    return (
      <Card className="glass-card p-6">
        <div className="flex items-center space-x-3 text-red-400">
          <AlertCircle className="w-6 h-6" />
          <span className="text-lg font-semibold">Submission Error</span>
        </div>
        <p className="text-red-300 mt-2">{error}</p>
      </Card>
    )
  }

  if (!result) {
    return null
  }

  return (
    <Card className="glass-card p-6">
      <div className="space-y-6">
        {/* Results Summary */}
        <div className="text-center">
          <div className={`inline-flex items-center space-x-3 px-6 py-3 rounded-full text-lg font-semibold ${
            result.accepted 
              ? 'bg-green-500/20 text-green-400 border border-green-500/30' 
              : 'bg-red-500/20 text-red-400 border border-red-500/30'
          }`}>
            {result.accepted ? (
              <>
                <Check className="w-6 h-6" />
                <span>ACCEPTED</span>
              </>
            ) : (
              <>
                <X className="w-6 h-6" />
                <span>REJECTED</span>
              </>
            )}
          </div>
          
          <div className="mt-4 flex items-center justify-center space-x-8 text-slate-300">
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-400">{result.totalTests}</div>
              <div className="text-sm">Total Tests</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-green-400">{result.passedTests}</div>
              <div className="text-sm">Passed</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-red-400">{result.failedTests}</div>
              <div className="text-sm">Failed</div>
            </div>
          </div>
        </div>

        {/* Test Cases Table */}
        <div className="space-y-4">
          <h3 className="text-lg font-semibold text-slate-100 flex items-center space-x-2">
            <span>Test Cases Results</span>
            <span className="text-sm text-slate-400 font-normal">
              ({result.passedTests}/{result.totalTests} passed)
            </span>
          </h3>
          
          <div className="overflow-x-auto">
            <table className="w-full text-sm border-collapse">
              <thead>
                <tr className="text-left border-b border-slate-700">
                  <th className="p-3 text-slate-300 font-medium">#</th>
                  <th className="p-3 text-slate-300 font-medium">Input</th>
                  <th className="p-3 text-slate-300 font-medium">Expected Output</th>
                  <th className="p-3 text-slate-300 font-medium">Your Output</th>
                  <th className="p-3 text-slate-300 font-medium">Verdict</th>
                </tr>
              </thead>
              <tbody>
                {result.testCases.map((testCase, index) => (
                  <tr key={index} className="border-b border-slate-800/50 hover:bg-slate-800/20">
                    <td className="p-3 text-slate-400 font-mono">{index + 1}</td>
                    <td className="p-3">
                      <div className="max-w-xs overflow-hidden">
                        <code className="text-xs bg-slate-800/50 px-2 py-1 rounded whitespace-pre-wrap break-all">
                          {testCase.input}
                        </code>
                      </div>
                    </td>
                    <td className="p-3">
                      <div className="max-w-xs overflow-hidden">
                        <code className="text-xs bg-slate-800/50 px-2 py-1 rounded whitespace-pre-wrap break-all">
                          {testCase.expected}
                        </code>
                      </div>
                    </td>
                    <td className="p-3">
                      <div className="max-w-xs overflow-hidden">
                        <code className={`text-xs px-2 py-1 rounded whitespace-pre-wrap break-all ${
                          testCase.passed 
                            ? 'bg-green-800/30 text-green-300' 
                            : 'bg-red-800/30 text-red-300'
                        }`}>
                          {testCase.userOutput}
                        </code>
                      </div>
                    </td>
                    <td className="p-3">
                      <div className={`inline-flex items-center space-x-1 px-2 py-1 rounded-full text-xs font-medium ${
                        testCase.passed 
                          ? 'bg-green-500/20 text-green-400' 
                          : 'bg-red-500/20 text-red-400'
                      }`}>
                        {testCase.passed ? (
                          <>
                            <Check className="w-3 h-3" />
                            <span>PASS</span>
                          </>
                        ) : (
                          <>
                            <X className="w-3 h-3" />
                            <span>FAIL</span>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Detailed Failed Cases */}
        {result.failedTests > 0 && (
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-red-400 flex items-center space-x-2">
              <X className="w-5 h-5" />
              <span>Failed Test Cases Details</span>
            </h3>
            
            {result.testCases
              .filter(testCase => !testCase.passed)
              .map((testCase, index) => (
                <div key={index} className="p-4 bg-red-500/10 border border-red-500/20 rounded-lg">
                  <h4 className="font-semibold text-red-300 mb-3">Test Case {result.testCases.indexOf(testCase) + 1}</h4>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                    <div>
                      <div className="text-slate-400 mb-1">Input:</div>
                      <code className="block bg-slate-800/50 px-3 py-2 rounded whitespace-pre-wrap break-all">
                        {testCase.input}
                      </code>
                    </div>
                    <div>
                      <div className="text-slate-400 mb-1">Expected Output:</div>
                      <code className="block bg-green-800/30 px-3 py-2 rounded whitespace-pre-wrap break-all text-green-300">
                        {testCase.expected}
                      </code>
                    </div>
                    <div>
                      <div className="text-slate-400 mb-1">Your Output:</div>
                      <code className="block bg-red-800/30 px-3 py-2 rounded whitespace-pre-wrap break-all text-red-300">
                        {testCase.userOutput}
                      </code>
                    </div>
                  </div>
                </div>
              ))}
          </div>
        )}
      </div>
    </Card>
  )
}
