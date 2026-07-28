# Repository Link Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add the canonical GitHub repository URL to the root README and push the isolated documentation change to `origin/main`.

**Architecture:** This is a documentation-only change. A new `Repository` section in `README.md` will link directly to the canonical GitHub URL; no application or build files will change.

**Tech Stack:** Markdown, Git, GitHub over SSH

## Global Constraints

- Update only `README.md` during implementation.
- Use `https://github.com/ImEvanQi/fex-admin` as the canonical URL.
- Do not include `outputs/ai-agent-opportunity-map/` in any commit.

---

### Task 1: Add and publish the repository link

**Files:**
- Modify: `README.md`
- Test: Markdown diff and Git commit inspection

**Interfaces:**
- Consumes: Existing root README structure.
- Produces: A visible Markdown link to the canonical GitHub repository.

- [ ] **Step 1: Add the repository section**

Insert this section after the introductory paragraph and before `Quick Start`:

```markdown
## Repository

[github.com/ImEvanQi/fex-admin](https://github.com/ImEvanQi/fex-admin)
```

- [ ] **Step 2: Verify Markdown scope and formatting**

Run:

```bash
git diff --check -- README.md
git diff -- README.md
```

Expected: no whitespace errors and a diff containing only the new `Repository` section.

- [ ] **Step 3: Commit only the README**

```bash
git add README.md
git commit -m "docs: add repository link"
```

- [ ] **Step 4: Verify commit isolation**

Run:

```bash
git show --stat --oneline --summary HEAD
git diff-tree --no-commit-id --name-only -r HEAD
```

Expected: the implementation commit contains only `README.md`.

- [ ] **Step 5: Push and verify the remote branch**

```bash
git push origin main
git ls-remote origin refs/heads/main
git rev-parse HEAD
```

Expected: the remote `main` object ID equals local `HEAD`.

