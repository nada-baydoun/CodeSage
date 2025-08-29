// Submission runner utility for evaluating user code against generated test cases
import { runPythonWithInput, outputsMatch, normalizeOutput } from './pyRunner'

export interface TestCase {
  input: string
  expected: string
  userOutput: string
  passed: boolean
}

export interface SubmissionResult {
  accepted: boolean
  testCases: TestCase[]
  totalTests: number
  passedTests: number
  failedTests: number
}

export interface ProblemChecker {
  id: string
  contestId: number
  index: string
  generator: {
    exists: boolean
    code: string
  }
  solutions_py_decontaminated: {
    exists: boolean
    codes: string[]
  }
  best_solution: string
  prompt: string[]
  generation: string[]
  thinking_steps: string[]
}

export async function evaluateSubmission(
  problemId: string,
  userCode: string,
  numTestCases: number = 10
): Promise<SubmissionResult> {
  console.log('🚀 Starting submission evaluation for problem:', problemId)
  console.log('📝 User code length:', userCode.length, 'characters')
  
  // Validate inputs
  if (!problemId || !userCode.trim()) {
    throw new Error('Problem ID and user code are required')
  }
  
  if (numTestCases < 1 || numTestCases > 100) {
    throw new Error('Number of test cases must be between 1 and 100')
  }
  
  try {
  // Helpers for data URLs (support external hosting)
  const DATA_BASE = (process.env.NEXT_PUBLIC_DATA_BASE_URL || "").replace(/\/$/, "");
  const dataUrl = (name: string) => (DATA_BASE ? `${DATA_BASE}/${name}` : `/data/${name}`);

  // Step 1: Load checker JSON and extract problem data
  console.log('\n📋 Step 1: Loading checker.json...')
    
    // Add timeout and better error handling for the fetch
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), 30000) // 30 second timeout
    
  let checkerData
    
    try {
      // Fetch the main checker1.json
      console.log('🔄 Trying to load main checker1.json...')
      const bust = `?t=${Date.now()}`
      const checkerResponse = await fetch(`${dataUrl('checker1.json')}${bust}`, {
        signal: controller.signal,
        cache: 'no-store'
      })

      clearTimeout(timeoutId)

      if (!checkerResponse.ok) {
        throw new Error(`Failed to load checker1.json: ${checkerResponse.status} ${checkerResponse.statusText}`)
      }

      const contentType = checkerResponse.headers.get('content-type') || ''
      console.log('🧾 Content-Type:', contentType)

      console.log('✅ Checker1.json response received, parsing JSON...')
      const contentLength = checkerResponse.headers.get('content-length')
      console.log('📏 Content length:', contentLength ? `${contentLength} bytes` : 'Unknown')

      const text = await checkerResponse.text()
      console.log('📄 Raw response preview (first 500 chars):', text.substring(0, 500))
      console.log('📄 Raw response length:', text.length, 'characters')

      // Validate JSON shape
      const looksLikeHtml = /^\s*<|<!DOCTYPE html>/i.test(text)
      const isJsonType = /application\/json|json/i.test(contentType)
      if (!text.trim() || looksLikeHtml || !isJsonType) {
        const reason = !text.trim() ? 'empty' : (looksLikeHtml ? 'HTML instead of JSON' : `unexpected Content-Type: ${contentType}`)
        throw new Error(`checker1.json invalid: ${reason}. If using local files, ensure public/data/checker1.json exists. If using an external URL, set NEXT_PUBLIC_DATA_BASE_URL and allow GET with application/json.`)
      }

      checkerData = JSON.parse(text)
      console.log('✅ JSON parsed successfully')

    } catch (fetchError) {
      const msg = fetchError instanceof Error ? fetchError.message : String(fetchError)
      throw new Error(`Failed to load checker data. ${msg}`)
    }

    console.log(`✅ Checker.json loaded successfully`)
    
    // Step 2: Extract the specific problem data
    console.log('\n🔍 Step 2: Extracting problem data...')
    
    if (!checkerData || typeof checkerData !== 'object') {
      throw new Error('Checker.json does not contain valid data')
    }
    
    const availableProblems = Object.keys(checkerData)
    console.log('📋 Available problems in checker.json:', availableProblems.length)
    console.log('📋 First 10 problem IDs:', availableProblems.slice(0, 10))
    
    const problemData = checkerData[problemId]
    if (!problemData) {
      throw new Error(`Problem ${problemId} not found in checker.json. Available problems: ${availableProblems.slice(0, 10).join(', ')}...`)
    }
    
    const checker: ProblemChecker = problemData
    console.log('✅ Problem data extracted:', {
      id: checker.id,
      contestId: checker.contestId,
      index: checker.index,
      hasGenerator: checker.generator.exists,
      hasBestSolution: !!checker.best_solution
    })
    
    // Step 3: Extract and validate generator code
    console.log('\n⚙️ Step 3: Extracting generator code...')
    if (!checker.generator.exists || !checker.generator.code) {
      throw new Error('Generator code not available for this problem')
    }
    
    const generatorCode = checker.generator.code
    console.log('✅ Generator code extracted, length:', generatorCode.length, 'characters')
    console.log('📄 Generator code preview:', generatorCode.substring(0, 200) + '...')
    
    // Step 4: Generate random test inputs
    console.log('\n🎲 Step 4: Generating random test inputs...')
    const testInputs: string[] = []
    
    for (let i = 0; i < numTestCases; i++) {
      console.log(`  Generating test case ${i + 1}/${numTestCases}...`)
      try {
        const result = await runPythonWithInput(generatorCode, '')
        if (result.exception) {
          console.warn(`⚠️ Generator failed for test case ${i + 1}:`, result.exception)
          // Use a fallback input if generator fails
          testInputs.push(`test_input_${i + 1}`)
        } else {
          const output = result.stdout || result.value || ''
          if (output.trim()) {
            testInputs.push(output.trim())
            console.log(`  ✅ Generated input ${i + 1}:`, output.trim())
          } else {
            console.warn(`⚠️ Generator produced empty output for test case ${i + 1}`)
            testInputs.push(`test_input_${i + 1}`)
          }
        }
      } catch (error) {
        console.warn(`⚠️ Generator execution failed for test case ${i + 1}:`, error)
        testInputs.push(`test_input_${i + 1}`)
      }
    }
    
    console.log('✅ Generated test inputs:', testInputs)
    
    // Step 5: Extract best solution
    console.log('\n🏆 Step 5: Extracting best solution...')
    if (!checker.best_solution) {
      throw new Error('Best solution not available for this problem')
    }
    
    const bestSolution = checker.best_solution
    console.log('✅ Best solution extracted, length:', bestSolution.length, 'characters')
    console.log('📄 Best solution preview:', bestSolution.substring(0, 200) + '...')
    
    // Step 6: Run best solution with generated inputs to get expected outputs
    console.log('\n🎯 Step 6: Running best solution with test inputs...')
    const expectedOutputs: string[] = []
    
    for (let i = 0; i < testInputs.length; i++) {
      console.log(`  Running best solution with input ${i + 1}...`)
      try {
        const result = await runPythonWithInput(bestSolution, testInputs[i])
        if (result.exception) {
          console.warn(`⚠️ Best solution failed for input ${i + 1}:`, result.exception)
          expectedOutputs.push(`expected_output_${i + 1}`)
        } else {
          const output = result.stdout || result.value || ''
          expectedOutputs.push(output.trim())
          console.log(`  ✅ Expected output ${i + 1}:`, output.trim())
        }
      } catch (error) {
        console.warn(`⚠️ Best solution execution failed for input ${i + 1}:`, error)
        expectedOutputs.push(`expected_output_${i + 1}`)
      }
    }
    
    console.log('✅ Expected outputs generated:', expectedOutputs)
    
    // Step 7: Run user code with generated inputs
    console.log('\n👤 Step 7: Running user code with test inputs...')
    const userOutputs: string[] = []
    
    for (let i = 0; i < testInputs.length; i++) {
      console.log(`  Running user code with input ${i + 1}...`)
      try {
        const result = await runPythonWithInput(userCode, testInputs[i])
        if (result.exception) {
          console.warn(`⚠️ User code failed for input ${i + 1}:`, result.exception)
          userOutputs.push(`ERROR: ${result.exception}`)
        } else {
          const output = result.stdout || result.value || ''
          userOutputs.push(output.trim())
          console.log(`  ✅ User output ${i + 1}:`, output.trim())
        }
      } catch (error) {
        console.warn(`⚠️ User code execution failed for input ${i + 1}:`, error)
        userOutputs.push(`ERROR: ${error}`)
      }
    }
    
    console.log('✅ User outputs generated:', userOutputs)
    
    // Step 8: Compare outputs
    console.log('\n🔍 Step 8: Comparing outputs...')
    
    let allPassed = true
    const comparisonResults: Array<{
      testCase: number
      input: string
      expected: string
      userOutput: string
      passed: boolean
      reason?: string
    }> = []
    
    for (let i = 0; i < numTestCases; i++) {
      const input = testInputs[i]
      const expected = expectedOutputs[i]
      const userOutput = userOutputs[i]
      
      console.log(`  🔍 Comparing test case ${i + 1}...`)
      console.log(`    📥 Input: "${input}"`)
      console.log(`    🎯 Expected: "${expected}"`)
      console.log(`    👤 User output: "${userOutput}"`)
      
      // Check if outputs match
      const passed = outputsMatch(expected, userOutput)
      
      if (passed) {
        console.log(`    ✅ Test case ${i + 1}: PASSED`)
      } else {
        allPassed = false
        console.log(`    ❌ Test case ${i + 1}: FAILED`)
        
        // Provide detailed comparison info
        const expectedNormalized = normalizeOutput(expected)
        const userNormalized = normalizeOutput(userOutput)
        
        let reason = 'Outputs do not match'
        if (expectedNormalized !== userNormalized) {
          reason = `Normalized outputs differ: expected "${expectedNormalized}" vs got "${userNormalized}"`
        } else if (expected !== userOutput) {
          reason = `Exact outputs differ: expected "${expected}" vs got "${userOutput}"`
        }
        
        console.log(`    📊 Reason: ${reason}`)
        
        // Try to identify the specific difference
        if (expected.includes(' ') && userOutput.includes(' ')) {
          const expectedParts = expected.split(/\s+/)
          const userParts = userOutput.split(/\s+/)
          
          if (expectedParts.length !== userParts.length) {
            console.log(`    📏 Length mismatch: expected ${expectedParts.length} parts, got ${userParts.length}`)
          } else {
            for (let j = 0; j < expectedParts.length; j++) {
              if (expectedParts[j] !== userParts[j]) {
                console.log(`    🔍 Part ${j + 1} differs: expected "${expectedParts[j]}" vs got "${userParts[j]}"`)
              }
            }
          }
        }
      }
      
      comparisonResults.push({
        testCase: i + 1,
        input,
        expected,
        userOutput,
        passed,
        reason: passed ? undefined : 'Outputs do not match'
      })
    }
    
    const accepted = allPassed
    
    console.log('\n📊 Step 9: Final Results')
    console.log('=====================================')
    console.log(`Total test cases: ${testInputs.length}`)
         const passedCount = comparisonResults.filter(r => r.passed).length
         console.log(`Passed: ${passedCount}`)
         const failedCount = testInputs.length - passedCount
     console.log(`Failed: ${failedCount}`)
    console.log(`Final verdict: ${accepted ? '✅ ACCEPTED' : '❌ REJECTED'}`)
    console.log('=====================================')
    
    // Step 10: Save results (optional - you can implement file saving here)
    console.log('\n💾 Step 10: Results summary saved in memory')
    
    const result: SubmissionResult = {
      accepted,
      testCases: comparisonResults.map(r => ({
        input: r.input,
        expected: r.expected,
        userOutput: r.userOutput,
        passed: r.passed
      })),
      totalTests: testInputs.length,
             passedTests: allPassed ? testInputs.length : comparisonResults.filter(r => r.passed).length,
      failedTests: failedCount
    }
    
    return result
    
  } catch (error) {
    console.error('❌ Submission evaluation failed:', error)
    throw error
  }
}

// Helper function to format test case results for display
export function formatTestResults(result: SubmissionResult): string {
  let output = `\n📊 Test Results Summary\n`
  output += `=====================================\n`
  output += `Total Tests: ${result.totalTests}\n`
  output += `Passed: ${result.passedTests}\n`
  output += `Failed: ${result.failedTests}\n`
  output += `Verdict: ${result.accepted ? '✅ ACCEPTED' : '❌ REJECTED'}\n`
  output += `=====================================\n\n`
  
  if (result.failedTests > 0) {
    output += `❌ Failed Test Cases:\n`
    result.testCases.forEach((testCase, index) => {
      if (!testCase.passed) {
        output += `\nTest Case ${index + 1}:\n`
        output += `Input: ${testCase.input}\n`
        output += `Expected: ${testCase.expected}\n`
        output += `Your Output: ${testCase.userOutput}\n`
        output += `---\n`
      }
    })
  }
  
  return output
}
