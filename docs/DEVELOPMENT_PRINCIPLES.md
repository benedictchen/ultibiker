# UltiBiker Development Principles

## Core Development Philosophy

### 1. **LEVERAGE EXISTING LIBRARIES AND OPEN SOURCE** 🚀

**CRITICAL PRINCIPLE**: UltiBiker prioritizes using proven, well-maintained open source libraries over custom implementations. This accelerates development, improves reliability, and reduces maintenance burden.

#### Current Successful Examples:
- **ANT+ Integration**: Using `ant-plus-next` library instead of custom ANT+ protocol implementation
- **Bluetooth**: Using `@abandonware/noble` for BLE device access
- **Database**: Using `drizzle-orm` + `better-sqlite3` instead of raw SQL
- **WebSocket**: Using `socket.io` for real-time communication
- **UI Framework**: Using Bootstrap + Chart.js for responsive UI and data visualization
- **Build Tools**: Using modern stack (Vite, TypeScript, Biome) instead of custom build pipeline

#### Library Selection Criteria:
1. **Active maintenance** (recent commits, responsive maintainers)
2. **Strong community** (GitHub stars, downloads, community support)
3. **TypeScript support** (either native or quality type definitions)
4. **Production-ready** (used by other successful projects)
5. **License compatibility** (MIT/Apache/BSD preferred)

#### Before Writing Custom Code, Check:
- [ ] Does an NPM package exist for this functionality?
- [ ] Is there a well-established open source solution?
- [ ] Can existing libraries be combined to solve the problem?
- [ ] Would a thin wrapper around existing libraries work?

### 2. **Technical Stack Philosophy**

#### Backend Libraries (Node.js/TypeScript)
- **Web Framework**: Express.js (industry standard, extensive ecosystem)
- **Database ORM**: Drizzle ORM (TypeScript-first, performant)
- **Real-time**: Socket.io (battle-tested WebSocket implementation)
- **Hardware Integration**: Noble (BLE), ant-plus-next (ANT+)
- **Validation**: Zod (TypeScript schema validation)
- **Testing**: Vitest (modern, fast testing framework)

#### Frontend Libraries
- **UI Framework**: Bootstrap 5 (mature, responsive, extensive components)
- **Charts**: Chart.js (proven charting library with real-time capabilities)
- **Icons**: Font Awesome (comprehensive icon library)
- **Build**: Vite (fast modern build tool)

#### Development Tools
- **Language**: TypeScript (type safety, better developer experience)
- **Formatting**: Biome (fast, all-in-one linting/formatting)
- **Package Manager**: npm (standard, reliable)
- **Testing**: Vitest + Playwright (modern testing stack)

### 3. **Integration Strategy**

#### When Adding New Features:
1. **Research existing solutions first**
2. **Prototype with proven libraries**
3. **Validate before committing to custom code**
4. **Document library choices and rationale**

#### Library Integration Best Practices:
- **Wrap complex libraries** in service classes for easier testing/replacement
- **Use dependency injection** for better testability
- **Document integration points** for future maintainers
- **Keep library versions updated** but test thoroughly

### 4. **Examples of AVOID Custom Implementation**

❌ **Don't Reinvent**:
- Custom WebSocket implementation → Use Socket.io
- Custom charting → Use Chart.js or similar
- Custom Bluetooth protocol parsing → Use Noble + established parsers  
- Custom database queries → Use Drizzle ORM
- Custom validation → Use Zod schemas
- Custom HTTP client → Use fetch or axios
- Custom testing framework → Use Vitest/Jest

✅ **Custom Implementation Only When**:
- No suitable library exists
- Performance requirements exceed library capabilities
- Security requirements need custom implementation
- Integration requirements are highly specific

### 5. **Library Evaluation Process**

When evaluating a new library dependency:

```markdown
## Library Evaluation Checklist

**Library**: [name]
**Purpose**: [what problem it solves]
**Alternatives Considered**: [list other options]

### Evaluation Criteria:
- [ ] **Maintenance**: Last commit within 6 months
- [ ] **Community**: >1000 GitHub stars OR >100k weekly downloads
- [ ] **TypeScript**: Native TS or quality @types package
- [ ] **Documentation**: Good README, examples, API docs
- [ ] **License**: Compatible with MIT/Apache
- [ ] **Size**: Reasonable bundle size impact
- [ ] **Dependencies**: Minimal transitive dependencies
- [ ] **Testing**: Library has good test coverage
- [ ] **Security**: No known security vulnerabilities

### Decision: [ACCEPT/REJECT]
**Rationale**: [explain decision]
```

### 6. **Future Agent Instructions**

**FOR ALL FUTURE DEVELOPMENT WORK ON ULTIBIKER**:

1. **ALWAYS search for existing libraries first** before implementing custom solutions
2. **Prioritize established, well-maintained packages** over newer alternatives
3. **Use the evaluation checklist** above for any new dependencies
4. **Document the rationale** for library choices in code comments
5. **Keep the tech stack consistent** with choices listed above
6. **Update this document** when adding significant new library dependencies

### 7. **Current Dependencies to Maintain**

Keep these core dependencies up-to-date and well-integrated:

#### Production Dependencies:
```json
{
  "@abandonware/noble": "BLE device communication",
  "ant-plus-next": "ANT+ protocol support", 
  "better-sqlite3": "Fast SQLite database",
  "drizzle-orm": "TypeScript-first ORM",
  "express": "Web framework",
  "socket.io": "Real-time WebSocket communication",
  "zod": "Runtime type validation",
  "helmet": "Security middleware",
  "cors": "CORS handling"
}
```

#### Development Dependencies:
```json
{
  "@biomejs/biome": "Fast linting and formatting",
  "typescript": "Type safety",
  "vitest": "Modern testing framework", 
  "@playwright/test": "E2E testing",
  "tsx": "TypeScript execution",
  "vite": "Build tool"
}
```

## Conclusion

**The UltiBiker project succeeds by standing on the shoulders of giants.** Our value comes from integration, user experience, and cycling-specific features - not from reimplementing common functionality.

**Every line of custom code is a liability.** Choose proven libraries, integrate thoughtfully, and focus development effort on what makes UltiBiker unique in the cycling sensor ecosystem.

---

**⚠️ IMPORTANT FOR FUTURE AGENTS**: Always check this document before starting significant development work. The "leverage existing libraries" principle is fundamental to UltiBiker's development philosophy and long-term maintainability.