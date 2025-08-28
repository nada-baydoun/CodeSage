# Testing the Submission System

## Quick Test Guide

### 1. Start the Development Server
```bash
npm run dev
```

### 2. Navigate to a Problem
Go to: `http://localhost:3000/problems/306/A` (or any valid problem)

### 3. Test the Submission System

#### Test Case 1: Simple Python Code
```python
# Simple solution that should work
n, m = map(int, input().split())
q, r = divmod(n, m)
result = [q] * (m - r) + [q + 1] * r
print(' '.join(map(str, result)))
```

#### Test Case 2: Code with Errors
```python
# This code has a syntax error
n, m = map(int, input().split())
q, r = divmod(n, m)
result = [q] * (m - r) + [q + 1] * r
print(' '.join(map(str, result))  # Missing closing parenthesis
```

#### Test Case 3: Infinite Loop (Be Careful!)
```python
# This will cause an infinite loop - use with caution
while True:
    pass
```

### 4. What to Expect

#### Console Output
When you click Submit, you should see detailed logging in the browser console (F12 → Console):

```
🚀 Starting submission evaluation for problem: 306/A
📝 User code length: 150 characters

📋 Step 1: Loading checker.json...
✅ Checker.json loaded successfully

🔍 Step 2: Extracting problem data...
✅ Problem data extracted: { id: "306/A", contestId: 306, index: "A", hasGenerator: true, hasBestSolution: true }

⚙️ Step 3: Extracting generator code...
✅ Generator code extracted, length: 500 characters
📄 Generator code preview: import random...

🎲 Step 4: Generating random test inputs...
  Generating test case 1/10...
  ✅ Generated input 1: 15 3
  Generating test case 2/10...
  ✅ Generated input 2: 42 7
  ...

🏆 Step 5: Extracting best solution...
✅ Best solution extracted, length: 200 characters
📄 Best solution preview: n, m = map(int, input().split())...

🎯 Step 6: Running best solution with test inputs...
  Running best solution with input 1...
  ✅ Expected output 1: 5 5 5
  ...

👤 Step 7: Running user code with test inputs...
  Running user code with input 1...
  ✅ User output 1: 5 5 5
  ...

🔍 Step 8: Comparing outputs...
  ✅ Test case 1: PASSED
  ✅ Test case 2: PASSED
  ...

📊 Step 9: Final Results
=====================================
Total test cases: 10
Passed: 10
Failed: 0
Final verdict: ✅ ACCEPTED
=====================================

💾 Step 10: Results summary saved in memory
```

#### Visual Results
Below the code editor, you'll see a comprehensive results table showing:
- Overall verdict (ACCEPTED/REJECTED)
- Test case details (Input, Expected Output, Your Output, Verdict)
- Detailed breakdown of failed test cases

### 5. Troubleshooting

#### If you see "Problem not found":
- Check that the problem ID format is correct (e.g., "306/A")
- Verify that the problem exists in checker.json

#### If the generator fails:
- Some problems may have incomplete generator code
- The system will fall back to placeholder inputs

#### If your code has errors:
- Syntax errors will be caught and displayed
- Runtime errors will be shown in the results table

#### If the submission seems stuck:
- Check the console for error messages
- Make sure your code doesn't have infinite loops
- Try refreshing the page and submitting again

### 6. Performance Notes

- Each test case runs independently
- The system generates 10 random test cases by default
- Total submission time depends on code complexity and test case generation
- Console logging provides real-time feedback on progress

### 7. Advanced Testing

#### Test Different Code Patterns:
1. **Correct solutions** - Should be ACCEPTED
2. **Incorrect solutions** - Should be REJECTED with detailed failure info
3. **Edge cases** - Test with boundary conditions
4. **Error handling** - Test with invalid inputs

#### Monitor Console Output:
- Watch for any warnings or errors during test generation
- Verify that all 10 test cases are processed
- Check that output comparison is working correctly

## Success Criteria

The submission system is working correctly if:

✅ **Console shows all 10 steps with clear logging**
✅ **Test cases are generated and executed**
✅ **Results table displays comprehensive information**
✅ **ACCEPTED/REJECTED verdict is correct**
✅ **Failed test cases show detailed comparison**
✅ **Error handling works for invalid code**
✅ **Loading states display correctly**

## Next Steps

Once you've verified the basic functionality:

1. **Test with different problems** - Try various contest IDs and indices
2. **Test edge cases** - Very long code, empty code, etc.
3. **Performance testing** - Monitor execution time for complex problems
4. **Error scenarios** - Test network failures, invalid data, etc.

The system is designed to be robust and debuggable, so any issues should be clearly visible in the console output!
