# User Operation Drawer Simplification Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make the user operation Drawer easier to scan by separating frequent actions, grouped normal actions, and high-risk actions without changing existing handlers.

**Architecture:** Keep the existing modal Drawer lifecycle and action event contract. Add presentation-only computed groupings inside `UserOperationDrawer.vue`, render a compact quick-action strip, lightweight grouped rows, and a separately labeled high-risk section.

**Tech Stack:** Vue 3 SFC, Tailwind utility classes, existing `useDialogLifecycle`, existing Node test harness.

## Global Constraints

- Preserve all existing operation IDs, handlers, risk values, and availability rules.
- Preserve Drawer modal behavior: fixed header, internal scroll only, visible close button, no backdrop close, reduced motion timings.
- Do not hide any operation; low-frequency actions may be visually de-emphasized but must remain reachable in the same Drawer.
- Use compact operational UI, not marketing-style cards.

---

### Task 1: Simplify Operation Drawer Layout

**Files:**
- Modify: `src/admin/components/user/UserOperationDrawer.vue`
- Test: `test/userOperationEntryCenter.test.js`

**Interfaces:**
- Consumes: `getUserOperationGroups(user)` returning `{ id, label, entries }[]`.
- Produces: unchanged `emit('action', { id, user, trigger })` contract from `selectEntry(entry, event)`.

- [ ] **Step 1: Write tests for visual hierarchy**

Add source assertions that the Drawer renders:

```js
assert.match(source, /quickOperationEntries/)
assert.match(source, /normalOperationGroups/)
assert.match(source, /dangerOperationEntries/)
assert.match(source, /data-testid="user-operation-quick-actions"/)
assert.match(source, /data-testid="user-operation-danger-actions"/)
assert.match(source, /aria-label="高风险操作"/)
```

- [ ] **Step 2: Run focused test to verify it fails**

Run: `node --test test/userOperationEntryCenter.test.js`

Expected: FAIL because the new layout identifiers do not exist yet.

- [ ] **Step 3: Implement presentation-only grouping**

In `UserOperationDrawer.vue`, derive:

```js
const QUICK_ENTRY_IDS = new Set(['assets', 'deposit', 'freeze-account', 'direct-referrals'])
const dangerOperationEntries = computed(() => operationGroups.value.flatMap((group) => group.entries.filter((entry) => entry.risk === 'danger')))
const quickOperationEntries = computed(() => operationGroups.value.flatMap((group) => group.entries.filter((entry) => QUICK_ENTRY_IDS.has(entry.id))))
const normalOperationGroups = computed(() => operationGroups.value
  .map((group) => ({
    ...group,
    entries: group.entries.filter((entry) => entry.risk !== 'danger' && !QUICK_ENTRY_IDS.has(entry.id))
  }))
  .filter((group) => group.entries.length))
```

Render quick actions as compact two-column buttons, normal groups as lightweight list rows, and danger actions as a distinct bottom section.

- [ ] **Step 4: Run focused test**

Run: `node --test test/userOperationEntryCenter.test.js`

Expected: PASS.

- [ ] **Step 5: Run verification**

Run:

```bash
node --test test/userOperationEntryCenter.test.js test/userOperationLayering.test.js
node --test test/*.test.js
npm run build
git diff --check
```

Expected: all commands exit 0.
