#!/usr/bin/env node

/**
 * UltiBiker Test Suite Runner
 * Comprehensive test execution and reporting script
 */

const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');

class TestRunner {
  constructor() {
    this.testResults = {
      unit: { passed: 0, failed: 0, total: 0, duration: 0 },
      integration: { passed: 0, failed: 0, total: 0, duration: 0 },
      api: { passed: 0, failed: 0, total: 0, duration: 0 },
      e2e: { passed: 0, failed: 0, total: 0, duration: 0 },
      errorHandling: { passed: 0, failed: 0, total: 0, duration: 0 }
    };
    this.startTime = Date.now();
    this.args = process.argv.slice(2);
    this.categories = this.parseArguments();
  }

  parseArguments() {
    const categories = [];
    
    if (this.args.includes('--all') || this.args.length === 0) {
      return ['unit', 'integration', 'api', 'error-handling'];
    }
    
    if (this.args.includes('--unit')) categories.push('unit');
    if (this.args.includes('--integration')) categories.push('integration');
    if (this.args.includes('--api')) categories.push('api');
    if (this.args.includes('--e2e')) categories.push('e2e');
    if (this.args.includes('--error-handling')) categories.push('error-handling');
    
    return categories.length > 0 ? categories : ['unit'];
  }

  async runCommand(command, args = [], options = {}) {
    return new Promise((resolve, reject) => {
      console.log(`\\n🚀 Running: ${command} ${args.join(' ')}`);
      
      const process = spawn(command, args, {
        stdio: 'pipe',
        shell: true,
        ...options
      });

      let stdout = '';
      let stderr = '';

      process.stdout.on('data', (data) => {
        const output = data.toString();
        stdout += output;
        if (this.args.includes('--verbose')) {
          process.stdout.write(output);
        }
      });

      process.stderr.on('data', (data) => {
        const output = data.toString();
        stderr += output;
        if (this.args.includes('--verbose') || output.includes('error')) {
          process.stderr.write(output);
        }
      });

      process.on('close', (code) => {
        if (code === 0) {
          resolve({ stdout, stderr, code });
        } else {
          reject({ stdout, stderr, code, error: `Process exited with code ${code}` });
        }
      });

      process.on('error', (error) => {
        reject({ stdout, stderr, error: error.message });
      });
    });
  }

  parseTestResults(output) {
    const results = { passed: 0, failed: 0, total: 0, duration: 0 };
    
    // Parse Vitest output
    const passedMatch = output.match(/(\\d+) passed/);
    const failedMatch = output.match(/(\\d+) failed/);
    const totalMatch = output.match(/Test Files\\s+(\\d+) passed/);
    const durationMatch = output.match(/Time\\s+([\\d.]+[ms|s]+)/);
    
    if (passedMatch) results.passed = parseInt(passedMatch[1]);
    if (failedMatch) results.failed = parseInt(failedMatch[1]);
    if (totalMatch) results.total = parseInt(totalMatch[1]);
    if (durationMatch) {
      const duration = durationMatch[1];
      results.duration = duration.includes('s') ? 
        parseFloat(duration) * 1000 : 
        parseFloat(duration);
    }
    
    return results;
  }

  async runUnitTests() {
    console.log('\\n📋 Running Unit Tests...');
    try {
      const result = await this.runCommand('npx', [
        'vitest', 'run',
        '--config', 'vitest.config.ts',
        '--reporter=verbose',
        'tests/**/*.test.ts',
        '--exclude', 'tests/e2e/**',
        '--exclude', 'tests/integration/**'
      ]);
      
      this.testResults.unit = this.parseTestResults(result.stdout);
      console.log('✅ Unit tests completed');
      return result;
    } catch (error) {
      console.error('❌ Unit tests failed:', error.error);
      this.testResults.unit = this.parseTestResults(error.stdout || '');
      throw error;
    }
  }

  async runIntegrationTests() {
    console.log('\\n🔗 Running Integration Tests...');
    try {
      const result = await this.runCommand('npx', [
        'vitest', 'run',
        '--config', 'vitest.config.ts',
        '--reporter=verbose',
        'tests/integration/**/*.test.ts'
      ]);
      
      this.testResults.integration = this.parseTestResults(result.stdout);
      console.log('✅ Integration tests completed');
      return result;
    } catch (error) {
      console.error('❌ Integration tests failed:', error.error);
      this.testResults.integration = this.parseTestResults(error.stdout || '');
      throw error;
    }
  }

  async runApiTests() {
    console.log('\\n🌐 Running API Tests...');
    try {
      const result = await this.runCommand('npx', [
        'vitest', 'run',
        '--config', 'vitest.config.ts',
        '--reporter=verbose',
        'tests/api/**/*.test.ts'
      ]);
      
      this.testResults.api = this.parseTestResults(result.stdout);
      console.log('✅ API tests completed');
      return result;
    } catch (error) {
      console.error('❌ API tests failed:', error.error);
      this.testResults.api = this.parseTestResults(error.stdout || '');
      throw error;
    }
  }

  async runErrorHandlingTests() {
    console.log('\\n🚨 Running Error Handling Tests...');
    try {
      const result = await this.runCommand('npx', [
        'vitest', 'run',
        '--config', 'vitest.config.ts',
        '--reporter=verbose',
        'tests/**/*error*.test.ts',
        'tests/ui/error-handler.test.ts'
      ]);
      
      this.testResults.errorHandling = this.parseTestResults(result.stdout);
      console.log('✅ Error handling tests completed');
      return result;
    } catch (error) {
      console.error('❌ Error handling tests failed:', error.error);
      this.testResults.errorHandling = this.parseTestResults(error.stdout || '');
      throw error;
    }
  }

  async runE2ETests() {
    console.log('\\n🌐 Running E2E Tests...');
    console.log('⚠️  Make sure the server is running on http://localhost:3000');
    
    try {
      const result = await this.runCommand('npx', [
        'playwright', 'test',
        '--config', 'playwright.config.ts',
        '--reporter=list'
      ]);
      
      this.testResults.e2e = this.parseTestResults(result.stdout);
      console.log('✅ E2E tests completed');
      return result;
    } catch (error) {
      console.error('❌ E2E tests failed:', error.error);
      this.testResults.e2e = this.parseTestResults(error.stdout || '');
      throw error;
    }
  }

  async runCoverageReport() {
    if (this.args.includes('--no-coverage')) {
      return;
    }

    console.log('\\n📊 Generating Coverage Report...');
    try {
      const result = await this.runCommand('npx', [
        'vitest', 'run',
        '--coverage',
        '--config', 'vitest.config.ts'
      ]);
      
      console.log('✅ Coverage report generated');
      return result;
    } catch (error) {
      console.warn('⚠️  Coverage report failed:', error.error);
      // Don't fail the entire test suite for coverage issues
    }
  }

  async runLinting() {
    if (this.args.includes('--no-lint')) {
      return;
    }

    console.log('\\n🧹 Running Code Quality Checks...');
    try {
      await this.runCommand('npm', ['run', 'lint']);
      await this.runCommand('npm', ['run', 'type-check']);
      console.log('✅ Code quality checks passed');
    } catch (error) {
      console.warn('⚠️  Code quality issues found:', error.error);
      // Don't fail tests for linting issues in test mode
      if (this.args.includes('--strict')) {
        throw error;
      }
    }
  }

  generateReport() {
    const totalDuration = Date.now() - this.startTime;
    
    let totalPassed = 0;
    let totalFailed = 0;
    let totalTests = 0;

    console.log('\\n' + '='.repeat(80));
    console.log('🚴 UltiBiker Test Suite Results');
    console.log('='.repeat(80));
    
    Object.entries(this.testResults).forEach(([category, results]) => {
      if (results.total > 0 || results.passed > 0 || results.failed > 0) {
        const status = results.failed === 0 ? '✅' : '❌';
        const percentage = results.total > 0 ? 
          Math.round((results.passed / results.total) * 100) : 
          (results.passed > 0 ? 100 : 0);
        
        console.log(`${status} ${category.toUpperCase().padEnd(15)} | ${results.passed.toString().padStart(3)} passed | ${results.failed.toString().padStart(3)} failed | ${percentage}% success`);
        
        totalPassed += results.passed;
        totalFailed += results.failed;
        totalTests += Math.max(results.total, results.passed + results.failed);
      }
    });

    console.log('-'.repeat(80));
    const overallPercentage = totalTests > 0 ? Math.round((totalPassed / totalTests) * 100) : 0;
    const overallStatus = totalFailed === 0 && totalPassed > 0 ? '🎉' : totalFailed > 0 ? '💥' : '⚠️';
    
    console.log(`${overallStatus} OVERALL RESULTS     | ${totalPassed.toString().padStart(3)} passed | ${totalFailed.toString().padStart(3)} failed | ${overallPercentage}% success`);
    console.log(`⏱️  Total Duration: ${Math.round(totalDuration / 1000)}s`);
    console.log('='.repeat(80));

    // Quality gate checks
    if (overallPercentage < 85) {
      console.log('⚠️  WARNING: Test success rate below 85% quality gate');
    }
    
    if (totalFailed === 0 && totalPassed > 0) {
      console.log('🏆 All tests passed! UltiBiker is ready to ride! 🚴‍♂️🚴‍♀️');
    } else if (totalFailed > 0) {
      console.log('🔧 Some tests failed. Please review and fix issues before deployment.');
    } else {
      console.log('📋 No tests were executed. Check test configuration.');
    }

    // Save results to file
    this.saveResultsToFile({
      summary: {
        totalPassed,
        totalFailed,
        totalTests,
        successRate: overallPercentage,
        duration: totalDuration
      },
      categories: this.testResults,
      timestamp: new Date().toISOString(),
      environment: {
        node: process.version,
        platform: process.platform,
        arch: process.arch
      }
    });

    return totalFailed === 0 && totalPassed > 0;
  }

  saveResultsToFile(results) {
    try {
      const resultsDir = path.join(process.cwd(), 'test-results');
      if (!fs.existsSync(resultsDir)) {
        fs.mkdirSync(resultsDir, { recursive: true });
      }
      
      const filePath = path.join(resultsDir, `test-results-${Date.now()}.json`);
      fs.writeFileSync(filePath, JSON.stringify(results, null, 2));
      
      console.log(`📄 Test results saved to: ${filePath}`);
    } catch (error) {
      console.warn('⚠️  Failed to save test results:', error.message);
    }
  }

  printUsage() {
    console.log(`
🚴 UltiBiker Test Suite Runner

Usage: npm run test:suite [options]

Options:
  --all              Run all test categories (default)
  --unit             Run unit tests only
  --integration      Run integration tests only  
  --api              Run API tests only
  --e2e              Run end-to-end tests only
  --error-handling   Run error handling tests only
  
  --verbose          Show detailed test output
  --no-coverage      Skip coverage report
  --no-lint          Skip code quality checks
  --strict           Fail on linting issues
  
  --help             Show this help message

Examples:
  npm run test:suite --unit --verbose
  npm run test:suite --api --no-coverage
  npm run test:suite --all --strict
`);
  }

  async run() {
    if (this.args.includes('--help')) {
      this.printUsage();
      return;
    }

    console.log('🚴 Starting UltiBiker Test Suite...');
    console.log(`📋 Running categories: ${this.categories.join(', ')}`);

    let hasFailures = false;

    try {
      // Run linting first (optional)
      await this.runLinting();

      // Run test categories
      for (const category of this.categories) {
        try {
          switch (category) {
            case 'unit':
              await this.runUnitTests();
              break;
            case 'integration':
              await this.runIntegrationTests();
              break;
            case 'api':
              await this.runApiTests();
              break;
            case 'error-handling':
              await this.runErrorHandlingTests();
              break;
            case 'e2e':
              await this.runE2ETests();
              break;
            default:
              console.warn(`⚠️  Unknown test category: ${category}`);
          }
        } catch (error) {
          console.error(`❌ ${category} tests failed`);
          hasFailures = true;
          if (this.args.includes('--fail-fast')) {
            break;
          }
        }
      }

      // Generate coverage report
      await this.runCoverageReport();

    } catch (error) {
      console.error('💥 Test suite execution failed:', error.message);
      hasFailures = true;
    }

    // Generate final report
    const success = this.generateReport();

    process.exit(success && !hasFailures ? 0 : 1);
  }
}

// Run the test suite
const runner = new TestRunner();
runner.run().catch((error) => {
  console.error('💥 Fatal error:', error);
  process.exit(1);
});