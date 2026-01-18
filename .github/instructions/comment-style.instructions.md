---
applyTo: "**"
---

# Copilot Instructions: Comment Style Guidelines

## Comment Punctuation

All comments must follow standard grammatical rules for punctuation:

### End Punctuation Rule

**MANDATORY**: Every complete sentence in a comment must end with a period (.).

#### Applies to

- **Single-line comments**: `// This is a comment.`
- **Multi-line comments**: Each sentence within `/* */` or `/** */` blocks
- **JSDoc comments**: All description sentences in documentation blocks
- **Inline comments**: Comments appearing at the end of code lines
- **Configuration comments**: Comments in JSON, JSONC, TOML, YAML files

#### Examples

```typescript
// ✅ CORRECT: Comment ends with a period.
const API_URL = "https://api.example.com";

// ❌ INCORRECT: Missing period
const API_URL = "https://api.example.com";

/**
 * ✅ CORRECT: Fetches user data from the API.
 * Returns a promise that resolves to user object.
 */
async function fetchUser() {}

/**
 * ❌ INCORRECT: Missing periods
 * Fetches user data from the API
 * Returns a promise that resolves to user object
 */
async function fetchUser() {}
```

```json
{
  // ✅ CORRECT: Configuration for API endpoint.
  "apiUrl": "https://api.example.com",

  // ❌ INCORRECT: Missing period
  "apiUrl": "https://api.example.com"
}
```

### Exceptions

The following do NOT require ending punctuation:

1. **Fragment labels** (non-sentences):
   - `// TODO: Fix bug`
   - `// FIXME: Memory leak`
   - `// NOTE: Edge case`
   - `// WARNING: Deprecated`

2. **Code references** (single words or identifiers):
   - `// handleClick`
   - `// userService`

3. **Section headers** (when acting as titles):
   - `// === Configuration ===`
   - `// --- Utilities ---`

### Rationale

Proper punctuation in comments:

- Improves code professionalism and readability
- Maintains consistency across the codebase
- Signals completeness of thought
- Aligns with documentation best practices

### Enforcement

When generating or editing code:

1. Review all comments for proper sentence structure
2. Add periods to complete sentences
3. Verify multi-line comment blocks have proper punctuation
4. Ensure JSDoc descriptions are grammatically complete
