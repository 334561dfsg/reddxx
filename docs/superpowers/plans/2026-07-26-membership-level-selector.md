# Membership Level Selector Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the expanding VIP radio-card grid with the shared searchable single-select while rendering optional secondary labels without empty space or invented fallback copy.

**Architecture:** Extend `PanelSingleSelect` with an optional `description` field on each option, preserving its committed-value state machine and popup lifecycle. Derive normalized VIP options inside the membership Dialog and keep the existing numeric MFA payload unchanged.

**Tech Stack:** Vue 3 Composition API, Tailwind CSS, Node test runner, local Vue SFC harness.

## Global Constraints

- New selections must come from a current enabled option; stale selected values remain visible and block submission.
- Search, hover and keyboard active state must never commit a value.
- The Dialog retains its fixed frame, one scrolling body, safe close path, layer lifecycle and 200/150ms motion.
- Missing or duplicate subtitles render no subtitle and reserve no vertical space.
- Existing MFA payload remains `{ userId, vipLevel, reason }`.

---

### Task 1: Optional option descriptions in PanelSingleSelect

**Files:**
- Modify: `src/admin/components/form/PanelSingleSelect.vue`
- Modify: `test/panelSingleSelectBehavior.test.js`

**Interfaces:**
- Consumes: option objects `{ value, label, searchText?, disabled? }`.
- Produces: support for optional `description?: string` without changing emitted events.

- [ ] **Step 1: Write the failing rendering test**

Mount `PanelSingleSelect` with one `{ value: 1, label: '青铜会员', description: 'VIP1' }` option and one `{ value: 2, label: '白银会员' }` option. Open the panel and assert that `VIP1` is rendered once while the second option has no description node.

- [ ] **Step 2: Run the focused test and verify RED**

Run: `node --test test/panelSingleSelectBehavior.test.js`

Expected: FAIL because the option template currently renders only `option.label`.

- [ ] **Step 3: Render descriptions without changing selection semantics**

Change the option content to:

```vue
<span class="min-w-0 flex-1">
  <span class="block truncate">{{ option.label }}</span>
  <span v-if="String(option.description || '').trim()" class="mt-0.5 block truncate text-xs text-gray-500">
    {{ option.description }}
  </span>
</span>
```

Add `option.description` to the normalized search text so users can find either line. Do not change `displayText`, cached committed labels, active values, or emitted payloads.

- [ ] **Step 4: Run the focused test and verify GREEN**

Run: `node --test test/panelSingleSelectBehavior.test.js`

Expected: all PanelSingleSelect tests pass.

- [ ] **Step 5: Commit the isolated selector enhancement**

```bash
git add src/admin/components/form/PanelSingleSelect.vue test/panelSingleSelectBehavior.test.js
git commit -m "feat: support optional select subtitles"
```

### Task 2: Replace VIP radio cards with the searchable select

**Files:**
- Modify: `src/admin/components/user/UserMembershipMutationDialog.vue`
- Modify: `test/userCreditMembershipComponents.test.js`

**Interfaces:**
- Consumes: `snapshot.enabledVipLevels: Array<{ level, name?, displayName?, benefits? }>` and `PanelSingleSelect`.
- Produces: normalized options `{ value: number, label: string, description?: string, searchText: string, disabled: boolean }` and unchanged MFA request shape.

- [ ] **Step 1: Write failing Dialog tests**

Update the VIP test fixture to include at least 15 levels and levels with missing, duplicate and blank `displayName`/`name`. Assert:

```js
assert.ok(harness.findByTestId('membership-vip-level-select'))
assert.equal(harness.allNodes().filter((node) => node.getAttribute?.('name') === 'vip-target').length, 0)
assert.doesNotMatch(dialog.textContent, /标准会员权益/)
```

Open the selector, search for a high-numbered level, commit it, complete confirmation, and assert `{ userId, vipLevel, reason }`. Assert the current level option is disabled and a level with no distinct subtitle has no empty subtitle element.

- [ ] **Step 2: Run the focused test and verify RED**

Run: `node --test test/userCreditMembershipComponents.test.js`

Expected: FAIL because the Dialog still renders every level as a radio card.

- [ ] **Step 3: Implement normalized option labels**

Import `PanelSingleSelect`. Add helpers:

```js
const clean = (value) => String(value ?? '').trim()
const vipPrimaryLabel = (level) => clean(level.displayName) || clean(level.name) || `VIP${level.level}`
const vipSecondaryLabel = (level) => {
  const secondary = clean(level.name)
  return secondary && secondary !== vipPrimaryLabel(level) ? secondary : ''
}
const vipOptions = computed(() => enabledVipLevels.value.map((level) => ({
  value: Number(level.level),
  label: vipPrimaryLabel(level),
  description: vipSecondaryLabel(level),
  searchText: `${level.level} ${clean(level.name)} ${clean(level.displayName)}`,
  disabled: Number(level.level) === currentVipLevel.value
})))
```

Use numeric or `null` form state rather than the empty string. Replace the fieldset with `PanelSingleSelect`, expose it through `vipSelectRef`, pass `invalid` and `error-id`, and use that ref for initial/return focus.

- [ ] **Step 4: Make confirmation copy optional**

Render target level primary label always, render the secondary label only when non-empty, and render the target benefits row only when `selectedVip.benefits` contains non-empty items. Remove every `标准会员权益` fallback.

- [ ] **Step 5: Run focused tests and verify GREEN**

Run: `node --test test/userCreditMembershipComponents.test.js test/panelSingleSelectBehavior.test.js`

Expected: all focused tests pass and the VIP payload remains numeric.

- [ ] **Step 6: Commit the Dialog migration**

```bash
git add src/admin/components/user/UserMembershipMutationDialog.vue test/userCreditMembershipComponents.test.js
git commit -m "refactor: make membership levels searchable"
```

### Task 3: Membership regression verification

**Files:**
- Verify only.

**Interfaces:**
- Consumes: Tasks 1-2.
- Produces: verified membership selection behavior.

- [ ] **Step 1: Run membership and shared-select suites**

Run: `node --test test/userCreditMembershipComponents.test.js test/userCreditMembershipLayering.test.js test/userCreditMembershipRepository.test.js test/panelSingleSelectBehavior.test.js`

Expected: zero failures.

- [ ] **Step 2: Run diff validation**

Run: `git diff --check`

Expected: no output and exit code 0.

