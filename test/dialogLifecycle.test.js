import test from 'node:test'
import assert from 'node:assert/strict'
import {
  __resetDialogLayersForTests,
  getFocusableElements,
  isTopDialogLayer,
  registerDialogLayer,
  unregisterDialogLayer
} from '../src/admin/composables/useDialogLifecycle.js'

test('dialog layers only expose the most recently registered layer as topmost', () => {
  __resetDialogLayersForTests()
  const first = registerDialogLayer({ setAttribute() {}, removeAttribute() {} })
  const second = registerDialogLayer({ setAttribute() {}, removeAttribute() {} })
  assert.equal(isTopDialogLayer(first), false)
  assert.equal(isTopDialogLayer(second), true)
  unregisterDialogLayer(second)
  assert.equal(isTopDialogLayer(first), true)
})

test('focus candidates exclude disabled, hidden, and negative-tabindex controls', () => {
  const enabled = { disabled: false, hidden: false, tabIndex: 0, getAttribute: () => null }
  const disabled = { ...enabled, disabled: true }
  const hidden = { ...enabled, hidden: true }
  const negative = { ...enabled, tabIndex: -1 }
  const root = { querySelectorAll: () => [enabled, disabled, hidden, negative] }
  assert.deepEqual(getFocusableElements(root), [enabled])
})
