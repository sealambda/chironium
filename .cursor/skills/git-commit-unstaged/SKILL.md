---
name: git-commit-unstaged
description: Commit unstaged changes using Git MCP tools following surgical, revertible commit standards. Use when the user asks to commit changes, commit files, create commits, save changes to git, stage and commit, or mentions git commits. Always use this skill for committing to ensure one-file-per-commit standard is followed with proper Conventional Commits format including file paths.
---

# Git Commit Unstaged

This skill guides you through committing unstaged changes using Git MCP tools while following the project's commit standards: one file per commit, Conventional Commits format with paths.

## When to Use

Use this skill when:

- The user asks you to commit changes or files.
- The user mentions "git commit", "save changes", or "commit my work".
- You need to create commits following the project's commit standards.
- There are unstaged changes that need to be committed.
- The user asks to "commit everything" or "commit all changes".

**IMPORTANT**: This skill enforces one-file-per-commit discipline. Even if the user says "commit everything", you must create separate commits for each file.

## Workflow

Follow these steps in order:

### Step 1: Check Git Status

Use the `git_status` MCP tool to see what files have changes:

```javascript
CallMcpTool("user-git", "git_status", {
  repo_path: "/path/to/repo",
});
```

### Step 2: Review Unstaged Changes

For each unstaged file, examine the changes using `git_diff_unstaged`:

```javascript
CallMcpTool("user-git", "git_diff_unstaged", {
  repo_path: "/path/to/repo",
  context_lines: 3,
});
```

This shows all unstaged changes in a unified diff format.

### Step 3: Stage and Commit Files One at a Time

**CRITICAL**: One file per commit. For each unstaged file:

1. **Stage the file** using `git_add`:

```javascript
CallMcpTool("user-git", "git_add", {
  repo_path: "/path/to/repo",
  files: ["path/to/single/file.ext"],
});
```

1. **Craft commit message** following Conventional Commits format:

```sh
<type>(<scope>): <Verb> <description> in <path>
```

**Required components:**

- `type`: feat, fix, docs, style, refactor, perf, test, build, ci, chore, revert.
- `description`: Brief, clear explanation.
- `path`: Relative path from project root to the modified file.

**Recommended components:**

- `scope`: Identifies which part of codebase (e.g., client, auth, web, db).
- `Verb`: Infinitive form with uppercase first letter (e.g., Add, Fix, Update, Refactor).

**Examples:**

```sh
feat(client): Add Button component in frontend/src/components/ui/button.tsx
fix(auth): Resolve session timeout in backend/auth/user.ex
refactor(web): Extract helper functions in backend/web/controllers/page_controller.ex
docs: Update setup instructions in README.md
```

1. **Commit the file** using `git_commit`:

```javascript
CallMcpTool("user-git", "git_commit", {
  repo_path: "/path/to/repo",
  message:
    "feat(client): Add Button component in frontend/src/components/ui/button.tsx",
});
```

1. **Repeat** for each remaining unstaged file.

### Step 4: Verify All Files Committed

After committing all files, run `git_status` again to confirm no unstaged changes remain.

## Commit Message Guidelines

### Determining Type

| Type       | When to Use                                 |
| ---------- | ------------------------------------------- |
| `feat`     | New feature or capability.                  |
| `fix`      | Bug fix.                                    |
| `refactor` | Code restructuring without behavior change. |
| `docs`     | Documentation only.                         |
| `style`    | Formatting, whitespace (no code change).    |
| `test`     | Adding or updating tests.                   |
| `perf`     | Performance improvement.                    |
| `build`    | Build system or dependencies.               |
| `ci`       | CI configuration.                           |
| `chore`    | Maintenance tasks.                          |

### Determining Scope

Use consistent scopes based on directory:

| Directory Pattern            | Scope      | Example               |
| ---------------------------- | ---------- | --------------------- |
| `client/**` or `frontend/**` | `(client)` | Frontend files.       |
| `lib/*/web/**`               | `(web)`    | Web layer.            |
| `lib/*/core/**`              | `(core)`   | Core domain.          |
| `config/**`                  | `(config)` | Configuration.        |
| `test/**` or `tests/**`      | No scope   | Use `test` type only. |
| Root files                   | No scope   | Root-level files.     |

### Common Verbs

- `Add` - New file/feature/component.
- `Remove` - Delete functionality.
- `Fix` - Correct a bug.
- `Update` - Modify existing functionality.
- `Refactor` - Restructure code.
- `Extract` - Pull out code into separate unit.
- `Rename` - Change names.
- `Move` - Relocate files/code.
- `Improve` - Enhance existing functionality.
- `Optimize` - Performance improvement.

## Multiple Changes to Same File

If the same file has multiple independent changes:

1. Make first change → commit.
2. Make second change → commit.
3. Continue for each independent change.

Each commit should be independently revertible.

## Example: Full Workflow

User asks: "Commit my changes"

### Step 1: Check status

```javascript
CallMcpTool("user-git", "git_status", {
  repo_path: "/home/nitn/chironium",
});
```

Response shows:

- `client/src/components/Button.tsx` (new file).
- `client/src/pages/dashboard.tsx` (modified).

### Step 2: Review changes

```javascript
CallMcpTool("user-git", "git_diff_unstaged", {
  repo_path: "/home/nitn/chironium",
});
```

### Step 3a: Commit Button.tsx

```javascript
// Stage
CallMcpTool("user-git", "git_add", {
  repo_path: "/home/nitn/chironium",
  files: ["client/src/components/Button.tsx"],
});

// Commit
CallMcpTool("user-git", "git_commit", {
  repo_path: "/home/nitn/chironium",
  message:
    "feat(client): Add Button component in client/src/components/Button.tsx",
});
```

### Step 3b: Commit dashboard.tsx

```javascript
// Stage
CallMcpTool("user-git", "git_add", {
  repo_path: "/home/nitn/chironium",
  files: ["client/src/pages/dashboard.tsx"],
});

// Commit
CallMcpTool("user-git", "git_commit", {
  repo_path: "/home/nitn/chironium",
  message:
    "feat(client): Add dashboard layout in client/src/pages/dashboard.tsx",
});
```

### Step 4: Verify

```javascript
CallMcpTool("user-git", "git_status", {
  repo_path: "/home/nitn/chironium",
});
```

Response should show clean working tree.

## Important Notes

- **Never commit multiple files in one commit** - This violates the one-file-per-commit standard.
- **Always include the file path** in the commit message.
- **Use the project's workspace path** as `repo_path` (available in context).
- **Order commits logically** - Dependencies first when possible.
- **Each commit must be independently revertible** - Test this mentally before committing.

## Common Mistakes to Avoid

❌ **Multiple files in one commit**

```javascript
// WRONG
git_add({ files: ["file1.tsx", "file2.tsx"] });
git_commit({ message: "feat: Add components" });
```

✅ **Correct: One file per commit**

```javascript
// RIGHT
git_add({ files: ["file1.tsx"] });
git_commit({ message: "feat(client): Add Button in file1.tsx" });
git_add({ files: ["file2.tsx"] });
git_commit({ message: "feat(client): Add Card in file2.tsx" });
```

❌ **Missing file path in message**

```sh
feat(auth): Add login validation
```

✅ **Correct: Include path**

```sh
feat(auth): Add login validation in lib/auth/user.ex
```

❌ **Redundant scope in description**

```sh
feat(client): Add client Button in client/components/ui/button.tsx
```

✅ **Correct: Avoid redundancy**

```text
feat(client): Add Button component in client/components/ui/button.tsx
```
