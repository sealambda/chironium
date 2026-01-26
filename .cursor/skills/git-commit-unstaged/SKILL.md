---
name: git-commit-unstaged
description: Commit unstaged changes using Git MCP tools following revertible commit standards. Use when the user asks to commit changes, commit files, create commits, save changes to git, stage and commit, or mentions git commits. Always use this skill to ensure commits follow Conventional Commits format with paths, grouping related files when appropriate.
---

# Git Commit Unstaged

This skill guides you through committing unstaged changes using Git MCP tools while following the project's commit standards: one purpose per commit, Conventional Commits format with paths, and smart grouping of related files.

## When to Use

Use this skill when:

- The user asks you to commit changes or files.
- The user mentions "git commit", "save changes", or "commit my work".
- You need to create commits following the project's commit standards.
- There are unstaged changes that need to be committed.
- The user asks to "commit everything" or "commit all changes".

**IMPORTANT**: This skill groups related files when they share a common path AND the same purpose. Separate commits are created for different purposes or different paths.

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

### Step 3: Group and Analyze Changes

Analyze the changes and group files that can be committed together:

**Group files when ALL conditions are met:**

1. **Same purpose** - All changes serve the same fix/feat/refactor/etc.
2. **Common path** - Files share a common directory path.
3. **Logical unit** - Changes are tightly coupled and would typically be reverted together.

**Create separate commits when:**

- Files are in different top-level directories.
- Changes have different purposes (e.g., a fix and a refactor).
- Changes are unrelated even if in the same directory.

### Step 4: Stage and Commit by Group

For each group of related files (or single file):

1. **Stage the file(s)** using `git_add`:

```javascript
// Single file
CallMcpTool("user-git", "git_add", {
  repo_path: "/path/to/repo",
  files: ["path/to/single/file.ext"],
});

// Multiple related files
CallMcpTool("user-git", "git_add", {
  repo_path: "/path/to/repo",
  files: ["path/to/dir/file1.ext", "path/to/dir/file2.ext"],
});
```

2. **Craft commit message** following Conventional Commits format:

```sh
<type>(<scope>): <Verb> <description> in <path>
```

**Required components:**

- `type`: feat, fix, docs, style, refactor, perf, test, build, ci, chore, revert.
- `description`: Brief, clear explanation.
- `path`: File path (single file) or common directory path (grouped files).

**Recommended components:**

- `scope`: Identifies which part of codebase (e.g., client, auth, web, db).
- `Verb`: Infinitive form with uppercase first letter (e.g., Add, Fix, Update, Refactor).

**Examples:**

```sh
# Single file
feat(client): Add Button component in frontend/src/components/ui/button.tsx

# Grouped files (common path)
feat(client): Add form components in assets/src/components/ui/
fix(auth): Resolve token handling in lib/chironium/core/identity/
refactor(client): Extract layout components in assets/src/components/layout/
```

3. **Commit** using `git_commit`:

```javascript
CallMcpTool("user-git", "git_commit", {
  repo_path: "/path/to/repo",
  message: "feat(client): Add form components in assets/src/components/ui/",
});
```

4. **Repeat** for each remaining group.

### Step 5: Verify All Files Committed

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

- `assets/src/components/ui/button.tsx` (new file).
- `assets/src/components/ui/input.tsx` (new file).
- `assets/src/components/ui/card.tsx` (new file).
- `lib/chironium/core/identity/user.ex` (modified).

### Step 2: Review changes

```javascript
CallMcpTool("user-git", "git_diff_unstaged", {
  repo_path: "/home/nitn/chironium",
});
```

### Step 3: Analyze and group

- UI components (button, input, card): Same purpose (new components), common path (`assets/src/components/ui/`) → **Group together**.
- User.ex: Different path, different purpose → **Separate commit**.

### Step 4a: Commit UI components (grouped)

```javascript
// Stage all related files
CallMcpTool("user-git", "git_add", {
  repo_path: "/home/nitn/chironium",
  files: [
    "assets/src/components/ui/button.tsx",
    "assets/src/components/ui/input.tsx",
    "assets/src/components/ui/card.tsx",
  ],
});

// Commit with common path
CallMcpTool("user-git", "git_commit", {
  repo_path: "/home/nitn/chironium",
  message: "feat(client): Add UI components in assets/src/components/ui/",
});
```

### Step 4b: Commit user.ex (separate)

```javascript
// Stage
CallMcpTool("user-git", "git_add", {
  repo_path: "/home/nitn/chironium",
  files: ["lib/chironium/core/identity/user.ex"],
});

// Commit
CallMcpTool("user-git", "git_commit", {
  repo_path: "/home/nitn/chironium",
  message:
    "fix(auth): Resolve token validation in lib/chironium/core/identity/user.ex",
});
```

### Step 5: Verify

```javascript
CallMcpTool("user-git", "git_status", {
  repo_path: "/home/nitn/chironium",
});
```

Response should show clean working tree.

## Important Notes

- **Group related files** - Files with common path AND same purpose can be committed together.
- **Always include the path** - File path (single) or common directory path (grouped).
- **Use the project's workspace path** as `repo_path` (available in context).
- **Order commits logically** - Dependencies first when possible.
- **Each commit must be independently revertible** - Test this mentally before committing.

## Common Mistakes to Avoid

❌ **Grouping unrelated files**

```javascript
// WRONG - different purposes
git_add({ files: ["button.tsx", "user.ex"] });
git_commit({ message: "feat: Add button and fix auth" });
```

✅ **Correct: Group only related files with common path**

```javascript
// RIGHT - same purpose, common path
git_add({ files: ["ui/button.tsx", "ui/input.tsx", "ui/card.tsx"] });
git_commit({ message: "feat(client): Add UI components in assets/src/components/ui/" });
```

❌ **Missing path in message**

```sh
feat(auth): Add login validation
```

✅ **Correct: Include path**

```sh
feat(auth): Add login validation in lib/auth/user.ex
```

❌ **Grouping files from different directories**

```sh
# WRONG - different top-level directories
feat: Add user feature in assets/ and lib/
```

✅ **Correct: Separate commits for different paths**

```sh
feat(client): Add UserForm in assets/src/components/
feat(auth): Add User resource in lib/chironium/core/identity/
```

❌ **Redundant scope in description**

```sh
feat(client): Add client Button in client/components/ui/button.tsx
```

✅ **Correct: Avoid redundancy**

```text
feat(client): Add Button component in client/components/ui/button.tsx
```
