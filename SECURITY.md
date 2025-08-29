# Security Guidelines for UltiBiker

## 🔐 Environment Variables & Secrets

### Required Security Variables
The following environment variables are **REQUIRED** and must contain secure, randomly generated values:

- `JWT_SECRET` - Used for signing JWT tokens (minimum 32 characters)
- `SESSION_SECRET` - Used for Express session encryption (minimum 32 characters) 
- `HEALTH_CHECK_TOKEN` - Used for authenticated health checks (minimum 16 characters)

### Generating Secure Values
Use one of these methods to generate cryptographically secure secrets:

```bash
# Generate a 32-character hex string
openssl rand -hex 32

# Generate a 64-character base64 string
openssl rand -base64 48

# On macOS/Linux, you can also use:
head -c 32 /dev/urandom | base64
```

### Environment Configuration

1. **Copy the template**: `cp .env.example .env`
2. **Generate secure values** for all required secrets
3. **Never commit** `.env` files to version control
4. **Use different secrets** for each environment (dev, staging, production)

## 🚫 Prohibited Actions

### DO NOT:
- ❌ Hardcode secrets in source code
- ❌ Commit `.env` files to git
- ❌ Use default or example secret values in production
- ❌ Log sensitive information (passwords, tokens, keys)
- ❌ Share secrets via email, chat, or documentation
- ❌ Store secrets in frontend code or public repositories

### DO:
- ✅ Use environment variables for all secrets
- ✅ Generate strong, unique secrets for each environment
- ✅ Rotate secrets regularly
- ✅ Use secret management systems in production
- ✅ Sanitize logs to remove sensitive data
- ✅ Review code for hardcoded secrets before committing

## 🛡️ Data Sanitization

The application includes automatic sanitization for:
- Sensor data logging (removes `password`, `token`, `secret`, `key` fields)
- Error reporting (sensitive fields filtered out)
- WebSocket communications (data validation and sanitization)

## 🔍 Security Auditing

Run these commands periodically to check for security issues:

```bash
# Check for potential secrets in code
git log --all -p | grep -i "password\|secret\|key\|token" | head -20

# Scan for hardcoded patterns
grep -r "password\|secret\|api_key" src/ --exclude-dir=node_modules

# Check .env files are properly ignored
git status --porcelain | grep -E "\.env($|\.)"
```

## 🚨 Incident Response

If a secret is accidentally committed:

1. **Immediately rotate the compromised secret**
2. **Remove from git history**: `git filter-branch` or BFG Repo-Cleaner
3. **Update all environments** with new secret values
4. **Notify team members** if applicable
5. **Review access logs** for potential unauthorized usage

## 📋 Production Deployment Checklist

Before deploying to production:

- [ ] All secrets use strong, unique values
- [ ] No `.env` files committed to repository  
- [ ] No hardcoded secrets in source code
- [ ] Environment variables properly configured
- [ ] CORS origins restricted to production domains
- [ ] Rate limiting enabled with appropriate thresholds
- [ ] Sentry DSN configured for error monitoring
- [ ] Health check tokens configured
- [ ] SSL/TLS certificates properly configured

## 🔧 Security Middleware

The application includes:

- **Rate limiting**: Prevents brute force attacks
- **CORS protection**: Restricts cross-origin requests
- **Input validation**: Zod schemas validate all inputs
- **Error handling**: Prevents information leakage
- **Request sanitization**: Cleans incoming data
- **Logging protection**: Filters sensitive information

## 📞 Reporting Security Issues

To report security vulnerabilities:
1. **Do not** create public GitHub issues
2. Email security concerns to the maintainers
3. Include detailed reproduction steps
4. Allow reasonable time for response before disclosure

## 🔄 Regular Security Tasks

### Weekly:
- Review commit history for potential secrets
- Check for new security vulnerabilities in dependencies
- Validate environment variable configurations

### Monthly:
- Rotate development secrets
- Review access logs for unusual activity
- Update security dependencies

### Quarterly:
- Full security audit of codebase
- Penetration testing (if applicable)
- Review and update security policies

---

**Remember: Security is everyone's responsibility. When in doubt, ask for help rather than risking a security incident.**