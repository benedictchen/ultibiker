#!/usr/bin/env tsx

import { execSync, spawn } from 'child_process';
import { existsSync } from 'fs';
import { resolve } from 'path';

interface TestSuite {
  name: string;
  pattern: string;
  description: string;
  timeout?: number;
}

const TEST_SUITES: TestSuite[] = [
  {
    name: 'unit',
    pattern: 'tests/**/*.test.ts',
    description: 'Unit tests for individual components',
    timeout: 30000
  },
  {
    name: 'integration',
    pattern: 'tests/integration/**/*.test.ts',
    description: 'Integration tests for API and services',
    timeout: 60000
  },
  {
    name: 'api',
    pattern: 'tests/api/**/*.test.ts',
    description: 'Comprehensive API endpoint tests',
    timeout: 45000
  },
  {
    name: 'websocket',
    pattern: 'tests/websocket/**/*.test.ts',
    description: 'WebSocket communication tests',
    timeout: 30000
  },
  {
    name: 'database',
    pattern: 'tests/database/**/*.test.ts',
    description: 'Database schema and operations tests',
    timeout: 20000
  },
  {
    name: 'sensors',
    pattern: 'tests/sensors/**/*.test.ts',
    description: 'Sensor integration and data parsing tests',
    timeout: 25000
  },
  {
    name: 'services',
    pattern: 'tests/services/**/*.test.ts',
    description: 'Business logic service tests',
    timeout: 20000
  },
  {
    name: 'performance',
    pattern: 'tests/performance/**/*.test.ts',
    description: 'Performance and load tests',
    timeout: 120000
  },
  {
    name: 'e2e',
    pattern: 'tests/e2e/**/*.spec.ts',
    description: 'End-to-end user workflow tests (Playwright)',
    timeout: 180000
  }
];

interface TestResult {
  suite: string;
  passed: number;
  failed: number;
  duration: number;
  coverage?: {
    lines: number;
    functions: number;
    branches: number;
    statements: number;
  };
}

class TestRunner {
  private results: TestResult[] = [];
  private verbose = false;
  private coverage = false;
  private bail = false;
  
  constructor(options: { verbose?: boolean; coverage?: boolean; bail?: boolean } = {}) {
    this.verbose = options.verbose || false;
    this.coverage = options.coverage || false;
    this.bail = options.bail || false;
  }

  async runSuite(suite: TestSuite): Promise<TestResult> {
    console.log(`\n🧪 Running ${suite.name} tests: ${suite.description}`);
    console.log(`   Pattern: ${suite.pattern}`);
    
    const startTime = Date.now();
    
    try {
      let command: string[];
      let runner: string;
      
      if (suite.name === 'e2e') {
        // Use Playwright for E2E tests
        runner = 'npx playwright test';
        command = [
          'npx',
          'playwright',
          'test',
          suite.pattern,
          '--timeout=60000'
        ];
      } else {
        // Use Vitest for other tests
        runner = 'npx vitest run';
        command = [
          'npx',
          'vitest',
          'run',
          suite.pattern,
          '--reporter=verbose'
        ];
        
        if (this.coverage) {
          command.push('--coverage');
        }
        
        if (suite.timeout) {
          command.push(`--testTimeout=${suite.timeout}`);
        }
      }
      
      if (this.verbose) {
        console.log(`   Command: ${command.join(' ')}`);
      }
      
      const result = execSync(command.join(' '), {
        cwd: process.cwd(),
        encoding: 'utf8',
        stdio: this.verbose ? 'inherit' : 'pipe'
      });
      
      const duration = Date.now() - startTime;
      
      // Parse test results from output
      const testResult = this.parseTestOutput(suite.name, result, duration);
      
      if (testResult.failed === 0) {
        console.log(`✅ ${suite.name} tests passed (${testResult.passed} tests, ${duration}ms)`);
      } else {
        console.log(`❌ ${suite.name} tests failed (${testResult.passed} passed, ${testResult.failed} failed, ${duration}ms)`);
      }
      
      return testResult;
      
    } catch (error: any) {
      const duration = Date.now() - startTime;
      console.log(`❌ ${suite.name} tests failed with error (${duration}ms)`);
      
      if (this.verbose) {
        console.error(error.message);
      }
      
      // Try to parse partial results from error output
      const testResult = this.parseTestOutput(suite.name, error.stdout || error.message, duration);
      
      return {
        suite: suite.name,
        passed: testResult.passed,
        failed: testResult.failed || 1, // At least one failure if we caught an error
        duration
      };
    }
  }
  
  private parseTestOutput(suiteName: string, output: string, duration: number): TestResult {
    // Parse Vitest output
    const passedMatch = output.match(/(\d+)\s+passed/);
    const failedMatch = output.match(/(\d+)\s+failed/);
    const skippedMatch = output.match(/(\d+)\s+skipped/);
    
    // Parse coverage if available
    let coverage;
    const coverageMatch = output.match(/All files\s+\|\s+([\d.]+)\s+\|\s+([\d.]+)\s+\|\s+([\d.]+)\s+\|\s+([\d.]+)/);
    if (coverageMatch) {
      coverage = {
        statements: parseFloat(coverageMatch[1]),
        branches: parseFloat(coverageMatch[2]),
        functions: parseFloat(coverageMatch[3]),
        lines: parseFloat(coverageMatch[4])
      };
    }
    
    return {
      suite: suiteName,
      passed: passedMatch ? parseInt(passedMatch[1]) : 0,
      failed: failedMatch ? parseInt(failedMatch[1]) : 0,
      duration,
      coverage
    };
  }
  
  async runAll(suiteNames?: string[]): Promise<void> {
    console.log('🚀 Starting UltiBiker Test Suite');
    console.log('=====================================');
    
    // Check prerequisites
    await this.checkPrerequisites();
    
    const suitesToRun = suiteNames 
      ? TEST_SUITES.filter(suite => suiteNames.includes(suite.name))
      : TEST_SUITES;
    
    console.log(`\nRunning ${suitesToRun.length} test suites:`);
    suitesToRun.forEach(suite => {
      console.log(`  • ${suite.name}: ${suite.description}`);
    });
    
    const startTime = Date.now();
    
    for (const suite of suitesToRun) {
      const result = await this.runSuite(suite);
      this.results.push(result);
      
      if (this.bail && result.failed > 0) {
        console.log('\n⚠️  Stopping test run due to failures (--bail mode)');
        break;
      }
    }
    
    const totalDuration = Date.now() - startTime;
    
    // Print summary
    this.printSummary(totalDuration);
    
    // Exit with appropriate code
    const totalFailed = this.results.reduce((sum, result) => sum + result.failed, 0);
    process.exit(totalFailed > 0 ? 1 : 0);
  }
  
  private async checkPrerequisites(): Promise<void> {
    console.log('\n🔍 Checking prerequisites...');
    
    // Check if database exists (create test database if needed)
    const testDbPath = './data/test-ultibiker.db';
    if (!existsSync(testDbPath)) {
      console.log('  • Creating test database...');
      try {
        execSync('npm run db:generate', { stdio: 'pipe' });
        console.log('    ✅ Test database ready');
      } catch (error) {
        console.log('    ⚠️  Database setup skipped (will use in-memory)');
      }
    }
    
    // Check if Playwright is installed for E2E tests
    try {
      execSync('npx playwright --version', { stdio: 'pipe' });
      console.log('  • ✅ Playwright is available');
    } catch (error) {
      console.log('  • ⚠️  Playwright not found, installing...');
      try {
        execSync('npx playwright install', { stdio: this.verbose ? 'inherit' : 'pipe' });
        console.log('    ✅ Playwright installed');
      } catch (installError) {
        console.log('    ❌ Failed to install Playwright');
      }
    }
    
    // Check Node.js version
    const nodeVersion = process.version;
    console.log(`  • Node.js version: ${nodeVersion}`);
    
    // Check available memory
    const memInfo = process.memoryUsage();
    const availableMB = Math.round(memInfo.heapTotal / 1024 / 1024);
    console.log(`  • Available memory: ${availableMB}MB`);
    
    if (availableMB < 512) {
      console.log('    ⚠️  Low memory available - some tests may be skipped');
    }
    
    console.log('✅ Prerequisites checked');
  }
  
  private printSummary(totalDuration: number): void {
    console.log('\n📊 Test Summary');
    console.log('===============');
    
    const totalPassed = this.results.reduce((sum, result) => sum + result.passed, 0);
    const totalFailed = this.results.reduce((sum, result) => sum + result.failed, 0);
    const totalTests = totalPassed + totalFailed;
    
    console.log(`\nOverall Results:`);
    console.log(`  Tests: ${totalTests}`);
    console.log(`  Passed: ${totalPassed} (${((totalPassed / totalTests) * 100).toFixed(1)}%)`);
    console.log(`  Failed: ${totalFailed} (${((totalFailed / totalTests) * 100).toFixed(1)}%)`);
    console.log(`  Duration: ${(totalDuration / 1000).toFixed(2)}s`);
    
    console.log(`\nSuite Breakdown:`);
    this.results.forEach(result => {
      const total = result.passed + result.failed;
      const passRate = total > 0 ? ((result.passed / total) * 100).toFixed(1) : '0.0';
      const status = result.failed === 0 ? '✅' : '❌';
      
      console.log(`  ${status} ${result.suite.padEnd(12)} ${result.passed.toString().padStart(3)}/${total.toString().padEnd(3)} (${passRate}%) ${(result.duration / 1000).toFixed(2)}s`);
      
      if (result.coverage) {
        console.log(`     Coverage: Lines ${result.coverage.lines}% | Functions ${result.coverage.functions}% | Branches ${result.coverage.branches}%`);
      }
    });
    
    if (totalFailed === 0) {
      console.log('\n🎉 All tests passed! 🎉');
    } else {
      console.log(`\n💥 ${totalFailed} test(s) failed`);
    }
    
    // Performance insights
    const slowestSuite = this.results.reduce((prev, current) => 
      prev.duration > current.duration ? prev : current
    );
    
    console.log(`\nPerformance:`);
    console.log(`  Slowest suite: ${slowestSuite.suite} (${(slowestSuite.duration / 1000).toFixed(2)}s)`);
    
    const avgDuration = totalDuration / this.results.length;
    console.log(`  Average suite duration: ${(avgDuration / 1000).toFixed(2)}s`);
    
    // Coverage summary
    const coverageResults = this.results.filter(r => r.coverage);
    if (coverageResults.length > 0) {
      const avgCoverage = {
        lines: coverageResults.reduce((sum, r) => sum + (r.coverage?.lines || 0), 0) / coverageResults.length,
        functions: coverageResults.reduce((sum, r) => sum + (r.coverage?.functions || 0), 0) / coverageResults.length,
        branches: coverageResults.reduce((sum, r) => sum + (r.coverage?.branches || 0), 0) / coverageResults.length,
        statements: coverageResults.reduce((sum, r) => sum + (r.coverage?.statements || 0), 0) / coverageResults.length
      };
      
      console.log(`\nOverall Coverage:`);
      console.log(`  Lines: ${avgCoverage.lines.toFixed(1)}%`);
      console.log(`  Functions: ${avgCoverage.functions.toFixed(1)}%`);
      console.log(`  Branches: ${avgCoverage.branches.toFixed(1)}%`);
      console.log(`  Statements: ${avgCoverage.statements.toFixed(1)}%`);
    }
  }
}

// CLI interface
if (require.main === module) {
  const args = process.argv.slice(2);
  
  const options = {
    verbose: args.includes('--verbose') || args.includes('-v'),
    coverage: args.includes('--coverage') || args.includes('-c'),
    bail: args.includes('--bail') || args.includes('-b')
  };
  
  const suiteNames = args.filter(arg => !arg.startsWith('-'));
  
  if (args.includes('--help') || args.includes('-h')) {
    console.log(`
UltiBiker Test Runner

Usage: npm run test:all [suite names] [options]

Suites:
${TEST_SUITES.map(suite => `  ${suite.name.padEnd(12)} ${suite.description}`).join('\n')}

Options:
  --verbose, -v    Verbose output
  --coverage, -c   Generate coverage reports
  --bail, -b       Stop on first failure
  --help, -h       Show this help

Examples:
  npm run test:all                    # Run all test suites
  npm run test:all unit api           # Run only unit and API tests
  npm run test:all --coverage         # Run all tests with coverage
  npm run test:all sensors --verbose  # Run sensor tests with verbose output
`);
    process.exit(0);
  }
  
  const runner = new TestRunner(options);
  runner.runAll(suiteNames.length > 0 ? suiteNames : undefined)
    .catch(error => {
      console.error('Test runner failed:', error);
      process.exit(1);
    });
}

export { TestRunner, TEST_SUITES };