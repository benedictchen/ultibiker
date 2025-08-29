# GitHub CLI Commands for UltiBiker

This guide shows how to manage GitHub Actions and repository settings using the GitHub CLI (`gh`).

## 🔐 Authentication

```bash
# Login to GitHub (one-time setup)
gh auth login --web

# Check authentication status
gh auth status

# Switch between GitHub accounts
gh auth switch
```

## 📋 Workflow Management

### **View Workflows**
```bash
# List all workflows
gh workflow list

# View specific workflow runs
gh run list --workflow="ci.yml" --limit 10

# Show latest run status
gh run list --limit 1

# Watch live workflow run
gh run watch
```

### **Trigger Workflows**
```bash
# Manually trigger a workflow
gh workflow run "CI/CD Pipeline"

# Trigger with inputs
gh workflow run "Release" --field version=v1.0.0

# Re-run failed workflow
gh run rerun 12345
```

### **Monitor Workflows**
```bash
# View workflow run details
gh run view 12345

# Show logs for failed jobs
gh run view 12345 --log-failed

# Download workflow artifacts
gh run download 12345
```

## 🔒 Branch Protection

### **Set Up Branch Protection**
```bash
# Enable branch protection for main
gh api repos/benedictchen/ultibiker/branches/main/protection \
  -X PUT \
  -f required_status_checks='{"strict":true,"contexts":["Code Quality & Security","Test Suite"]}' \
  -f enforce_admins=true \
  -f required_pull_request_reviews='{"required_approving_review_count":1}'

# View current protection rules
gh api repos/benedictchen/ultibiker/branches/main/protection
```

### **Update Protection Rules**
```bash
# Add new required status check
gh api repos/benedictchen/ultibiker/branches/main/protection/required_status_checks \
  -X PATCH \
  -f contexts='["Code Quality & Security","Test Suite","Security Scanning"]'

# Remove branch protection
gh api repos/benedictchen/ultibiker/branches/main/protection -X DELETE
```

## 🔑 Secrets Management

### **Repository Secrets**
```bash
# List all secrets (names only)
gh secret list

# Add a new secret
gh secret set NPM_TOKEN --body "your-npm-token-here"

# Set secret from file
gh secret set DEPLOY_KEY < ~/.ssh/deploy_key

# Delete a secret
gh secret delete NPM_TOKEN
```

### **Environment Secrets**
```bash
# List environments
gh api repos/benedictchen/ultibiker/environments

# Set environment-specific secret
gh secret set DATABASE_URL --env production --body "postgres://..."

# View environment secrets
gh secret list --env production
```

## ⚙️ Repository Settings

### **Actions Settings**
```bash
# View Actions permissions
gh api repos/benedictchen/ultibiker/actions/permissions

# Enable all actions
gh api repos/benedictchen/ultibiker -X PATCH -f allow_actions=all

# Restrict to verified actions only
gh api repos/benedictchen/ultibiker -X PATCH -f allow_actions=selected \
  -f actions_config='{"github_owned_allowed":true,"verified_allowed":true}'
```

### **General Repository Settings**
```bash
# View repository info
gh repo view benedictchen/ultibiker

# Update repository description
gh repo edit --description "UltiBiker - Advanced cycling sensor platform"

# Enable/disable features
gh repo edit --enable-issues --enable-wiki --enable-projects
```

## 🚀 Release Management

### **Create Releases**
```bash
# Create a release with tag
gh release create v1.0.0 --title "UltiBiker v1.0.0" --notes "First stable release"

# Upload assets to release
gh release upload v1.0.0 dist/server.zip dist/web.zip

# List releases
gh release list

# View specific release
gh release view v1.0.0
```

### **Pre-release and Drafts**
```bash
# Create draft release
gh release create v1.1.0-beta --draft --title "Beta Release"

# Create pre-release
gh release create v1.1.0-rc1 --prerelease --title "Release Candidate"

# Publish draft release
gh release edit v1.1.0-beta --draft=false
```

## 🐛 Issue and PR Management

### **Issues**
```bash
# List open issues
gh issue list --state open

# Create issue from template
gh issue create --title "Bug: Sensor connection timeout" \
  --body "Description of the bug..." \
  --label "bug,sensor"

# Close issue
gh issue close 123
```

### **Pull Requests**
```bash
# Create PR
gh pr create --title "Add new sensor support" \
  --body "Implements support for XYZ sensor" \
  --base main --head feature/new-sensor

# List PRs
gh pr list --state open

# Check PR status
gh pr status

# Merge PR
gh pr merge 456 --squash
```

## 📊 Repository Analytics

### **Traffic and Usage**
```bash
# View repository statistics
gh api repos/benedictchen/ultibiker --jq '{stars: .stargazers_count, forks: .forks_count, issues: .open_issues_count}'

# Get commit activity
gh api repos/benedictchen/ultibiker/stats/commit_activity

# View top referrers
gh api repos/benedictchen/ultibiker/traffic/popular/referrers
```

### **Actions Usage**
```bash
# View Actions usage/billing
gh api user/settings/billing/actions

# Repository Actions usage
gh api repos/benedictchen/ultibiker/actions/billing/usage
```

## 🔍 Troubleshooting

### **Debug Workflow Issues**
```bash
# Check workflow syntax
gh workflow view "ci.yml"

# View failed run logs
gh run view --log-failed

# List workflow artifacts
gh api repos/benedictchen/ultibiker/actions/artifacts

# Download specific artifact
gh api repos/benedictchen/ultibiker/actions/artifacts/123/zip --output artifact.zip
```

### **Repository Health**
```bash
# Check repository status
gh repo view --json defaultBranch,hasIssuesEnabled,hasWikiEnabled,pushedAt

# View branch information
gh api repos/benedictchen/ultibiker/branches

# Check collaboration settings
gh api repos/benedictchen/ultibiker/collaborators
```

## 🛠️ Automation Scripts

### **Daily Workflow Check**
```bash
#!/bin/bash
# Save as: scripts/daily-check.sh

echo "📊 Daily GitHub Actions Health Check"
echo "=================================="

echo "🔄 Latest workflow runs:"
gh run list --limit 3 --json status,conclusion,workflowName,createdAt \
  --template '{{range .}}{{.workflowName}}: {{.status}} ({{.conclusion}}) - {{timeago .createdAt}}{{"\n"}}{{end}}'

echo ""
echo "🔑 Repository secrets:"
gh secret list --json name --template '{{range .}}• {{.name}}{{"\n"}}{{end}}'

echo ""
echo "🔒 Branch protection status:"
gh api repos/benedictchen/ultibiker/branches/main/protection --jq '.required_status_checks.contexts'
```

### **Workflow Cleanup**
```bash
#!/bin/bash
# Delete old workflow runs (keep last 10)
gh run list --json databaseId --template '{{range .}}{{.databaseId}}{{"\n"}}{{end}}' | \
  tail -n +11 | \
  xargs -I {} gh api repos/benedictchen/ultibiker/actions/runs/{} -X DELETE
```

## 📚 Quick Reference

**Most Used Commands:**
```bash
gh run list                    # View recent runs
gh run watch                   # Watch live run
gh workflow run "CI/CD"        # Trigger workflow
gh secret set TOKEN           # Add secret
gh pr create                   # Create pull request
gh release create v1.0.0       # Create release
```

**Emergency Commands:**
```bash
gh run cancel 12345           # Cancel running workflow
gh workflow disable "Health"   # Disable problematic workflow
gh secret delete TOKEN        # Remove compromised secret
```

---

**Run the setup script:**
```bash
./scripts/setup-github-actions.sh
```

**View your Actions:**
https://github.com/benedictchen/ultibiker/actions