# Final fix report — PanelSingleSelect deferred Minor findings

## Scope and outcome

This wave changes only `src/admin/components/form/PanelSingleSelect.vue`, its
focused test suite, and this report. It addresses all three Minor findings in
`final-review.md`; it does not expand the component beyond explicit `panel`
placement or change any committed business value/payload contract.

## Finding-to-fix mapping

### 1. Dynamically disabled active option

- Production fix: exposed option state now derives from
  `renderedActiveOption`, which already requires the option to be enabled and
  present in the filtered DOM. Both `aria-selected` and the blue active styling
  use `optionIsExposedActive`; the internal `activeValue` remains separate for
  reconciliation.
- Regression: `an active option disabled by refresh is never exposed as
  selected or actively styled` records the parent post-render checkpoint before
  the selector's post-flush reconciliation. It verifies that the newly disabled
  option is already `aria-selected="false"`, lacks active styling, is absent
  from `aria-activedescendant`, and causes no value emission.
- RED evidence: before the fix the checkpoint observed
  `{ disabled: true, selected: 'true', activelyStyled: true }`; the test expected
  `selected: 'false'` and `activelyStyled: false`.

### 2. Queued DOM work after unmount/replacement

- Production fix: all component-owned `nextTick` work now goes through
  `queueInstanceTick`, and the positioning animation frame captures the same
  lifecycle generation. `onUnmounted` marks the instance disposed and advances
  its generation before resource teardown, so old scroll, position, opening
  focus, post-close focus, and commit-close callbacks cannot run. The known
  frame is still cancelled and cleared.
- Regressions:
  - `unmount invalidates pending selector DOM lookups and animation frames`
    opens and unmounts in the same turn, with scroll lookup and positioning work
    pending. It requires zero post-disposal global-ID reads and zero queued
    component frames.
  - `a replacement reusing idBase receives only its own queued DOM work`
    replaces an open selector with a new auto-opened instance using the same
    `reused-selector` ID base. Only the new instance's active option may be
    scrolled or focused.
- RED evidence: before the disposal guard, the unmount test performed one stale
  lookup of `reused-selector-option-string-61-63-74-69-76-65` and queued a
  frame. A guard-removal sensitivity run also made the replacement test scroll
  the old `...-72-65-76-69-65-77` option before the replacement's
  `...-61-63-74-69-76-65` option; both lifecycle tests failed.

### 3. Disabled disclosure during state-driven close

- Production fix: post-leave focus restoration now revalidates the requested
  target with the existing connected-scope, native-disabled, hidden, inert,
  `aria-hidden`, CSS visibility, and tab-index checks. If the disclosure is no
  longer available, the documented logical target is the next available
  control in DOM/tab order after the disclosure. An owning modal wraps within
  its focus boundary; a page scope does not wrap at the end.
- Regression: `state close moves focus to the logical next control when the
  trigger becomes disabled during leave` mounts the real dialog lifecycle,
  disables the disclosure while the panel is open, retains expanded state
  through leave, and proves focus moves exactly once to the following modal
  control without closing the parent modal.
- RED evidence: before the fix, the connected-but-disabled trigger was selected
  for restoration, its native `focus()` did nothing, and the logical next
  control's focus count was `0` instead of `1`.

## TDD and verification evidence

The three primary regressions were added and observed failing for the expected
missing behavior before their production corrections. The same-ID replacement
case was additionally mutation-checked by removing the disposal invalidation;
both lifecycle tests failed as described above, then passed after restoration.

- Focused command:
  `node --test test/panelSingleSelect.test.js test/dialogLifecycle.test.js`
  — 34 tests passed, 0 failed, 0 skipped.
- Full suite command: `node --test --test-reporter=spec`
  — 342 tests passed, 0 failed, 0 skipped.
- Production command: `npm run build`
  — Vite 5.4.21 transformed 404 modules and completed successfully in 4.17s.
- Whitespace commands: `git diff --check` and `git diff --cached --check`
  — no output from either command.

## Remaining release gate

No live browser, device, screen-reader, or physical virtual-keyboard session was
available in this code-only wave. The existing release gate therefore remains
unverified: real mouse/touch/keyboard and assistive-technology behavior; the
desktop/tablet/phone, orientation, low-height, 200% zoom, text enlargement,
dynamic browser chrome, virtual-keyboard, and four-direction safe-area matrix;
reduced motion and high contrast; actual clipping/stacking; and route/owner
replacement while selector work is pending. These checks must not be inferred
from the mounted harness or production build.
