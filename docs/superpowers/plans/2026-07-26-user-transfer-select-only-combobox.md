# User Transfer Select-only Combobox Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the account-transfer radio cards with compact, reusable, non-native Select-only Comboboxes while preserving transfer defaults, validation, balances, and payloads.

**Architecture:** Add a focused `SelectOnlyCombobox.vue` in the existing admin form component directory. It owns committed-option display, active-option navigation, type-ahead, popup positioning, Portal ownership, ARIA, and lifecycle cleanup; `UserTransferAction.vue` remains responsible for cross-field account-conflict validation and submission.

**Tech Stack:** Vue 3 Composition API, Tailwind CSS, WAI-ARIA Select-only Combobox pattern, Node test runner, the repository Vue SFC harness.

## Global Constraints

- Only the “账户间划转” flow changes; customer-service deposit and other funds actions remain unchanged.
- Do not use native `<select>` for the three transfer choice fields.
- Use explicit `searchPlacement: none`: options are few and stable, so no search input or responsive Drawer is introduced.
- Preserve the existing defaults: `market` → `trading`, with an empty coin value displaying “请选择”.
- Preserve the existing submit payload `{ type, amount, fromAccountKey, toAccountKey, coinKey }`.
- Never silently clear or replace an invalid destination or orphaned committed value.
- The Dialog backdrop, fixed-frame scrolling, close button, focus trap, close animation, scroll lock, and focus restoration behavior must remain unchanged.
- Report every real-browser input, viewport, zoom, virtual-keyboard, safe-area, reduced-motion, high-contrast, long-text, and assistive-technology check that was not actually performed as unverified.

---

## File Structure

- Create `src/admin/components/form/SelectOnlyCombobox.vue`: reusable non-searchable single-select UI, keyboard state machine, ARIA, Portal popup positioning, and owned-listener cleanup.
- Create `test/selectOnlyCombobox.test.js`: component contract tests independent of transfer business logic.
- Modify `src/admin/components/user/UserTransferAction.vue`: replace only the three radio groups, supply disabled destination options and field-owned error state.
- Modify `test/userFundsActionChoices.test.js`: leave deposit radio coverage intact and replace transfer radio assertions with Combobox behavior and payload assertions.

### Task 1: Reusable Select-only Combobox

**Files:**
- Create: `src/admin/components/form/SelectOnlyCombobox.vue`
- Create: `test/selectOnlyCombobox.test.js`

**Interfaces:**
- Consumes: `registerDialogPopupHost(dialogElement, popupHost)` and `unregisterDialogPopupHost(registration)` from `src/admin/composables/useDialogLifecycle.js`.
- Produces: Vue component props `modelValue: string|number|null`, `options: Array<{ value, label, disabled? }>`, `label`, `placeholder`, `required`, `disabled`, `readonly`, `invalid`, `errorId`, `idBase`; emits `update:modelValue(value)` and `change(value, option)`; exposes `focus()`.

- [ ] **Step 1: Write failing component contract tests**

Create `test/selectOnlyCombobox.test.js` with shared keyboard helpers and tests that assert:

```js
const baseProps = {
  modelValue: 'trading',
  options: [
    { value: 'market', label: '市币' },
    { value: 'wealth', label: '理财' },
    { value: 'trading', label: '交易合约' },
    { value: 'perp', label: '永续合约', disabled: true }
  ],
  label: '到',
  placeholder: '请选择',
  required: true,
  idBase: 'transfer-to'
}

test('keeps focus on the combobox and commits only with Enter or Space', async () => {
  // Open with Enter, assert active descendant is the committed option.
  // ArrowDown skips disabled options without emitting.
  // Enter emits update:modelValue and change exactly once and closes.
})

test('supports Home End Escape Tab and printable type-ahead without implicit commit', async () => {
  // Assert navigation changes only aria-activedescendant.
  // Escape and Tab close with modelValue unchanged; Tab is not prevented.
})

test('exposes one active option and valid stable ARIA references', async () => {
  // Assert role=combobox, aria-controls=transfer-to-listbox, rendered option IDs,
  // exactly one aria-selected=true while open, and no exposed options after close.
})

test('blocks disabled readonly duplicate and orphaned states without replacing values', async () => {
  // Assert disabled/readonly cannot open, duplicate values surface config error,
  // and an orphaned committed value keeps its cached/raw display and aria-invalid=true.
})
```

- [ ] **Step 2: Run the focused test and verify the missing component failure**

Run: `node --test test/selectOnlyCombobox.test.js`

Expected: FAIL because `src/admin/components/form/SelectOnlyCombobox.vue` does not exist.

- [ ] **Step 3: Implement the minimal component state and keyboard contract**

Implement stable instance IDs and these core functions in `SelectOnlyCombobox.vue`:

```js
function reconcileActive() {
  const enabled = props.options.filter((option) => !option.disabled)
  if (enabled.some((option) => valuesEqual(option.value, activeValue.value))) return
  activeValue.value = enabled.find((option) => valuesEqual(option.value, props.modelValue))?.value
    ?? enabled[0]?.value
    ?? null
}

function commitActive() {
  const option = props.options.find((candidate) => (
    !candidate.disabled && valuesEqual(candidate.value, activeValue.value)
  ))
  if (!option) return
  emit('update:modelValue', option.value)
  emit('change', option.value, option)
  closePopup('commit')
}

function handleKeydown(event) {
  if (!open.value && ['Enter', ' ', 'ArrowDown', 'ArrowUp'].includes(event.key)) openPopup(event)
  else if (open.value && event.key === 'ArrowDown') moveActive(1, event)
  else if (open.value && event.key === 'ArrowUp') moveActive(-1, event)
  else if (open.value && event.key === 'Home') moveToEdge(0, event)
  else if (open.value && event.key === 'End') moveToEdge(-1, event)
  else if (open.value && (event.key === 'Enter' || event.key === ' ')) commitActive(event)
  else if (open.value && event.key === 'Escape') closePopup('escape', event)
  else if (open.value && event.key === 'Tab') closePopup('tab')
  else if (!event.altKey && !event.ctrlKey && !event.metaKey && event.key.length === 1) moveByTypeAhead(event.key)
}
```

Render the focus-retaining main element with `role="combobox"`, stable `aria-controls`, `aria-expanded`, `aria-required`, `aria-invalid`, and a live `aria-activedescendant` only when the active option is rendered. Render the popup Listbox through `Teleport`, and use `role="option"`, stable option IDs, `aria-disabled`, and exactly one open-session `aria-selected="true"`.

- [ ] **Step 4: Add positioning, Dialog popup ownership, animation, and cleanup**

Reuse the proven viewport calculation shape from `PanelSingleSelect.vue`: anchor to the trigger, choose top/bottom by available height, use a fixed Portal popup, enforce at least anchor width, and constrain `maxHeight` with `100vh`, `100dvh`, and four safe-area insets. Register a modal-owned viewport host when the trigger is inside `role="dialog"[aria-modal="true"]`.

Add document `pointerdown`, window `resize`/capture-scroll, and `visualViewport` resize/scroll listeners on mount. On unmount, remove each listener, cancel the animation frame and type-ahead timer, unregister only this component's popup-host registration, and invalidate queued callbacks.

Use these scoped transitions:

```css
.select-only-combobox-enter-active { transition: opacity 150ms ease-out, transform 150ms ease-out; }
.select-only-combobox-leave-active { transition: opacity 100ms ease-in, transform 100ms ease-in; }
.select-only-combobox-enter-from,
.select-only-combobox-leave-to { opacity: 0; transform: translateY(-0.25rem); }
@media (prefers-reduced-motion: reduce) {
  .select-only-combobox-enter-active,
  .select-only-combobox-leave-active { transition-duration: 50ms; transform: none; }
}
```

- [ ] **Step 5: Run the component tests and repository dialog regressions**

Run: `node --test test/selectOnlyCombobox.test.js test/panelSingleSelect.test.js test/dialogLifecycle.test.js`

Expected: all tests PASS; if the lifecycle filename differs, locate it with `rg --files test | rg -i 'dialog.*lifecycle|lifecycle.*dialog'` and run the matching existing test file.

- [ ] **Step 6: Commit the reusable component**

```bash
git add src/admin/components/form/SelectOnlyCombobox.vue test/selectOnlyCombobox.test.js
git commit -m "feat: add select-only combobox"
```

### Task 2: Integrate the Combobox into Account Transfer

**Files:**
- Modify: `src/admin/components/user/UserTransferAction.vue:1-290`
- Modify: `test/userFundsActionChoices.test.js:1-210`

**Interfaces:**
- Consumes: `SelectOnlyCombobox` props and `v-model` contract from Task 1.
- Produces: unchanged transfer `submit` payload and a destination-field conflict error owned by `transfer-to-error`.

- [ ] **Step 1: Replace transfer-radio tests with failing Combobox integration tests**

Keep deposit tests unchanged. Replace only transfer-specific radio helpers/assertions with helpers that find Comboboxes by `idBase`, open them, navigate or click options, and finish transitions. Assert:

```js
assert.equal(fromTrigger.textContent.trim(), '市币')
assert.equal(toTrigger.textContent.trim(), '交易合约')
assert.equal(coinTrigger.textContent.trim(), '请选择')
assert.equal(harness.allNodes().filter((node) => (
  node.tag === 'select' && transferDialog.contains(node)
)).length, 0)
```

Add one test that selects `wealth`, `perp`, and `USDC` using keyboard interaction, enters `10.25`, submits, and asserts the unchanged payload. Add one conflict test that changes source to `trading`, asserts destination remains `trading`, `aria-invalid="true"`, `aria-describedby="transfer-to-error"`, no submit emission, then selects `perp` and submits successfully.

- [ ] **Step 2: Run the focused integration test and verify the radio implementation fails it**

Run: `node --test test/userFundsActionChoices.test.js`

Expected: FAIL because transfer still renders radio groups and no `SelectOnlyCombobox` triggers.

- [ ] **Step 3: Replace only the three transfer choice groups**

Import the component and normalize option shapes:

```js
import SelectOnlyCombobox from '../form/SelectOnlyCombobox.vue'

const transferAccountOptions = computed(() => props.assets ? [
  { value: 'market', label: '市币' },
  { value: 'wealth', label: '理财' },
  { value: 'trading', label: '交易合约' },
  { value: 'perp', label: '永续合约' }
] : [])

const destinationOptions = computed(() => transferAccountOptions.value.map((option) => ({
  ...option,
  disabled: option.value === form.value.fromAccountKey
})))

const destinationConflict = computed(() => (
  Boolean(form.value.toAccountKey) && form.value.fromAccountKey === form.value.toAccountKey
))
```

Render the fields as:

```vue
<SelectOnlyCombobox v-model="form.fromAccountKey" :options="transferAccountOptions" label="从" required id-base="transfer-from" />
<SelectOnlyCombobox
  v-model="form.toAccountKey"
  :options="destinationOptions"
  label="到"
  required
  :invalid="destinationConflict"
  error-id="transfer-to-error"
  id-base="transfer-to"
/>
<p v-if="destinationConflict" id="transfer-to-error" class="mt-1 text-sm text-red-700" role="alert">
  “从”账户和“到”账户不能相同，请重新选择“到”账户。
</p>
<SelectOnlyCombobox v-model="form.coinKey" :options="coinOptions" label="币种" placeholder="请选择" required id-base="transfer-coin" />
```

Change `coinOptions` to `{ value, label }` while keeping `form.coinKey` and emitted values unchanged. Update toast label lookup to use `value`. Preserve the existing final equality guard in `confirm()` as a race-safe business check.

- [ ] **Step 4: Run transfer and related funds tests**

Run: `node --test test/userFundsActionChoices.test.js test/userFundsComponents.test.js`

Expected: all tests PASS; deposit radio assertions remain unchanged, and transfer uses no native select or radio choice group.

- [ ] **Step 5: Commit the transfer integration**

```bash
git add src/admin/components/user/UserTransferAction.vue test/userFundsActionChoices.test.js
git commit -m "refactor: restore compact transfer selects"
```

### Task 3: Full Verification and Delivery Audit

**Files:**
- Verify: `src/admin/components/form/SelectOnlyCombobox.vue`
- Verify: `src/admin/components/user/UserTransferAction.vue`
- Verify: `test/selectOnlyCombobox.test.js`
- Verify: `test/userFundsActionChoices.test.js`

**Interfaces:**
- Consumes: completed component and integration from Tasks 1–2.
- Produces: evidence-backed automated verification and an explicit list of unverified real-browser checks.

- [ ] **Step 1: Run static guards and focused tests**

Run:

```bash
git diff --check
node --test test/selectOnlyCombobox.test.js test/userFundsActionChoices.test.js test/panelSingleSelect.test.js test/userFundsComponents.test.js
```

Expected: no whitespace errors and all focused tests PASS.

- [ ] **Step 2: Run the full automated test suite**

Run: `npm test`

Expected: all tests PASS. If unrelated pre-existing failures occur, record the exact failing test and confirm it also fails without these task files before classifying it as unrelated.

- [ ] **Step 3: Run the production build**

Run: `npm run build`

Expected: Vite exits with code 0 and produces the production bundle without Vue compiler errors.

- [ ] **Step 4: Review the final diff against the approved design**

Run:

```bash
git diff -- src/admin/components/form/SelectOnlyCombobox.vue src/admin/components/user/UserTransferAction.vue test/selectOnlyCombobox.test.js test/userFundsActionChoices.test.js
rg -n '<select\b|transfer-from-account|transfer-to-account|transfer-coin' src/admin/components/user/UserTransferAction.vue
```

Expected: no native select or old transfer radio names remain; only the intended transfer files and reusable component/test changed; deposit code remains untouched.

- [ ] **Step 5: Report verification honestly**

List automated commands and outcomes. Unless they were actually exercised in a real browser/device, explicitly mark mouse, touch, keyboard focus visuals, screen reader, 1440×900, 1280×720, tablet, narrow/landscape phone, low height, 200% zoom, virtual keyboard, dynamic viewport, four safe areas, Reduced Motion, high contrast, long text/font enlargement, popup flip, and resize-while-open as unverified and state the required manual check.
