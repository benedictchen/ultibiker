#!/bin/bash
# GitHub Actions Configuration Script
# Run this after: gh auth login --web

echo "🚀 Configuring GitHub Actions for UltiBiker..."

# 1. Enable GitHub Actions (if not already enabled)
echo "📋 Enabling GitHub Actions..."
gh api repos/benedictchen/ultibiker -X PATCH -f allow_actions=all

# 2. View current workflow runs
echo "🔍 Checking current workflow status..."
gh run list --limit 5

# 3. View workflow files
echo "📄 Listing workflow files..."
gh workflow list

# 4. Enable branch protection for main branch
echo "🔒 Setting up branch protection rules..."
gh api repos/benedictchen/ultibiker/branches/main/protection \
  -X PUT \
  -H "Accept: application/vnd.github+json" \
  -f required_status_checks='{"strict":true,"contexts":["Code Quality & Security","Test Suite"]}' \
  -f enforce_admins=true \
  -f required_pull_request_reviews='{"required_approving_review_count":1,"dismiss_stale_reviews":true}' \
  -f restrictions=null

# 5. Check Actions settings
echo "⚙️  Checking Actions settings..."
gh api repos/benedictchen/ultibiker/actions/permissions

# 6. List any existing secrets (names only, not values)
echo "🔑 Checking repository secrets..."
gh secret list

# 7. Show latest workflow run details
echo "📊 Latest workflow run details..."
gh run view --log-failed

echo "✅ GitHub Actions configuration complete!"
echo ""
echo "🌐 View workflows at: https://github.com/benedictchen/ultibiker/actions"
echo "⚙️  View settings at: https://github.com/benedictchen/ultibiker/settings"
echo ""
echo "Next steps:"
echo "1. Check that workflows are running successfully"
echo "2. Add deployment secrets when ready (NPM_TOKEN, etc.)"
echo "3. Test PR workflow by creating a feature branch"