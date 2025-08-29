# CI/CD Setup for UltiBiker

## Overview

This document outlines the CI/CD pipeline setup for UltiBiker using GitHub Actions, chosen as the optimal solution for build stability and developer productivity in 2025.

## Why GitHub Actions?

After researching the latest CI/CD tools in 2025, **GitHub Actions** was selected over Jenkins, CircleCI, GitLab CI, and Azure DevOps for these reasons:

### ✅ **Advantages for UltiBiker**
- **Zero Infrastructure**: No servers to maintain or configure
- **Native GitHub Integration**: Seamless with our existing GitHub repository
- **Cost-Effective**: 2,000 free minutes/month for private repos, unlimited for public
- **Node.js Excellence**: Pre-built actions optimized for Node.js/pnpm projects
- **Modern Workflow**: Event-driven automation with 40+ GitHub event triggers
- **Active Ecosystem**: 10,000+ community actions available
- **Enterprise Ready**: Advanced security, matrix builds, and parallel execution

### 📊 **2025 Comparison Results**
- **Build Performance**: CircleCI slightly faster but GitHub Actions sufficient for our needs
- **Free Tier**: GitHub Actions 2,000 min/month vs CircleCI 6,000 min/month 
- **Integration**: GitHub Actions wins with native repo integration
- **Maintenance**: GitHub Actions requires zero maintenance vs Jenkins' high overhead
- **Security**: Built-in CodeQL analysis and secret scanning

## Pipeline Architecture

### 🔄 **Main CI Pipeline** (`.github/workflows/ci.yml`)

Triggered on: `push` to `main/develop`, `pull_request`, manual dispatch

**Jobs:**
1. **Code Quality & Security** - Linting, formatting, type checking, audit
2. **Test Suite** - Unit, sensor, API tests across Node.js 18/20/22
3. **Build & Package** - Build all packages (server, web, core)
4. **Integration Tests** - Hardware-dependent tests (main branch only)
5. **Security Scanning** - CodeQL analysis for vulnerability detection
6. **Deploy** - Production deployment (main branch only)
7. **Notify** - Team notifications on success/failure

### ⚡ **PR Checks** (`.github/workflows/pr-checks.yml`)

Optimized for fast developer feedback:

- **Quick Checks** - Basic validation for all PRs
- **Full Test Suite** - Comprehensive testing for critical/release PRs  
- **Security Review** - Extra security scans for sensitive file changes

### 🚀 **Release Pipeline** (`.github/workflows/release.yml`)

Triggered on: Git tags (`v*.*.*`), manual dispatch

Features:
- Full test suite validation
- Multi-package builds
- Automated changelog generation
- GitHub release creation
- NPM publishing (when ready)

### 🏥 **Health Monitoring** (`.github/workflows/health-check.yml`)

Scheduled every 6 hours:
- Dependency security scanning
- Build health across Node.js versions
- Code quality trend analysis
- Automated issue creation for vulnerabilities

## Build Stability Features

### ✅ **Reliability Measures**
- **Concurrency Control**: Prevents pipeline conflicts
- **Matrix Testing**: Multiple Node.js versions (18, 20, 22)
- **Artifact Management**: 30-day retention for builds, 7-day for test results
- **Timeout Protection**: Prevents hanging on hardware tests
- **Conditional Execution**: Skip hardware tests when unavailable
- **Retry Logic**: Built-in GitHub Actions retry for transient failures

### 📊 **Quality Gates**
- **Lint & Format**: Code style consistency
- **Type Checking**: TypeScript validation
- **Security Audit**: Dependency vulnerability scanning  
- **Unit Tests**: Core functionality validation
- **Build Validation**: Ensure all packages build successfully
- **Integration Tests**: Real sensor functionality (when possible)

### 🔒 **Security**
- **CodeQL Analysis**: Static code analysis for vulnerabilities
- **Secret Scanning**: Prevent accidental credential commits
- **Dependency Audit**: Regular security vulnerability checks
- **Permission Controls**: Minimal required permissions per job

## Configuration Details

### **Environment Variables**
```yaml
# Required for deployment (configure in GitHub Settings > Secrets)
NODE_AUTH_TOKEN: ${{ secrets.NPM_TOKEN }}  # For NPM publishing
GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}  # Auto-provided by GitHub
```

### **Branch Protection Rules** (Recommended)
- Require PR reviews before merging to `main`
- Require status checks: `Quick Checks`, `Full Test Suite`
- Require up-to-date branches
- Restrict push to `main` branch

### **Labels for Enhanced Workflows**
- `critical` - Triggers full test suite on PRs
- `release` - Triggers comprehensive validation
- `security` - Triggers additional security scans
- `automated` - For bot-generated issues

## Cost Optimization

### **Free Tier Usage**
- **Current Usage**: ~500-800 minutes/month (estimated)
- **Free Allowance**: 2,000 minutes/month private, unlimited public
- **Cost Per Extra Minute**: $0.008 USD

### **Optimization Strategies**
1. **Linux Runners Only**: 1x multiplier (vs 2x Windows, 10x macOS)
2. **Conditional Jobs**: Skip expensive tests on draft PRs
3. **Efficient Caching**: NPM cache reduces install time
4. **Parallel Execution**: Multiple jobs run simultaneously
5. **Smart Triggers**: Only run full suite when necessary

### **Future Self-Hosted Option**
- **Zero Minute Cost**: Unlimited free minutes with self-hosted runners
- **Hardware Control**: Run tests requiring ANT+ sticks or Bluetooth
- **Setup Time**: ~1-2 hours to configure self-hosted runner

## Monitoring & Alerts

### **Build Status**
- **GitHub Badges**: Display build status in README
- **PR Status Checks**: Block merging on failures
- **Issue Creation**: Automatic security vulnerability alerts

### **Metrics Tracking**
- **Build Times**: Monitor pipeline performance
- **Test Results**: Track test success rates
- **Code Quality**: Line count, test coverage trends
- **Security**: Vulnerability detection over time

## Troubleshooting

### **Common Issues**

1. **"No ANT+ USB stick detected"**
   - Expected for integration tests without hardware
   - Tests marked as `continue-on-error: true`

2. **Timeout on Integration Tests**
   - Hardware tests have 10-minute timeout
   - Prevents infinite hanging on sensor connections

3. **Audit Failures**
   - Security audits may find low-severity issues
   - Moderate+ level issues require attention

4. **Cache Misses**
   - NPM cache speeds up installs
   - Cache automatically invalidates on package.json changes

### **Debug Steps**
1. Check workflow run logs in GitHub Actions tab
2. Verify environment variables and secrets
3. Test locally with same Node.js version
4. Check branch protection rules and required checks

## Migration from Jenkins (If Needed)

### **Jenkins vs GitHub Actions**

| Feature | Jenkins | GitHub Actions |
|---------|---------|----------------|
| Infrastructure | Self-hosted, requires maintenance | Cloud-hosted, zero maintenance |
| UI | Outdated, complex | Modern, integrated with GitHub |
| Configuration | Groovy/XML, complex | YAML, simple |
| Plugin Management | Manual, version conflicts | Built-in actions, marketplace |
| Security | Manual updates, vulnerabilities | Auto-patched, secure by default |
| Cost | Server + maintenance time | Pay-per-minute usage |
| Node.js Support | Requires plugin configuration | Native, optimized |

### **Migration Timeline** (If switching from Jenkins)
- **Day 1**: GitHub Actions workflows created ✅
- **Day 2-3**: Test workflows, fix any issues
- **Day 4-5**: Branch protection rules, team training
- **Week 2**: Parallel operation with Jenkins
- **Week 3**: Full migration, Jenkins decommission

## Next Steps

1. **✅ Complete**: GitHub Actions workflows implemented
2. **🔲 Pending**: Configure branch protection rules
3. **🔲 Pending**: Set up NPM publishing secrets (when going public)
4. **🔲 Future**: Self-hosted runners for hardware testing
5. **🔲 Future**: Deployment automation to production servers

## Resources

- [GitHub Actions Documentation](https://docs.github.com/en/actions)
- [Node.js Action](https://github.com/actions/setup-node)
- [PNPM Action](https://github.com/pnpm/action-setup)
- [CodeQL Analysis](https://github.com/github/codeql-action)
- [UltiBiker GitHub Repository](https://github.com/benedictchen/ultibiker)

---

**Last Updated**: January 2025  
**Maintained By**: UltiBiker Development Team