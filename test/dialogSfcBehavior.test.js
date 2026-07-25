import test from 'node:test'
import assert from 'node:assert/strict'
import { resolve } from 'node:path'
import { createSfcHarness, loadVueSfc } from './helpers/vueSfcHarness.js'

const projectFile = (path) => resolve(process.cwd(), path)

test('setting SFC runs both enter transitions before internal close and Escape become active', async (t) => {
  const component = await loadVueSfc(projectFile('src/admin/components/user-control/UserControlModal.vue'))
  let closeCount = 0
  const harness = await createSfcHarness(component, {
    open: false,
    scope: 'global',
    user: { id: 'user-a', username: 'Alpha', email: 'alpha@example.test' },
    existingRules: {}
  }, {
    onClose: () => {
      closeCount += 1
      harness.props.open = false
    }
  })
  t.after(harness.cleanup)

  harness.props.open = true
  await harness.flush()
  const frame = harness.findByTestId('user-control-dialog-frame')
  const overlay = frame.parent

  assert.equal(overlay.classList.contains('dialog-overlay-enter-from'), true)
  assert.equal(frame.classList.contains('dialog-panel-enter-from'), true)
  await harness.finishTransitions()

  harness.findByText('取消', 'button').click()
  await harness.flush()
  assert.equal(closeCount, 1)
  await harness.finishTransitions()

  harness.props.open = true
  await harness.flush()
  await harness.finishTransitions()
  const escape = harness.keydown('Escape')
  await harness.flush()
  assert.equal(escape.defaultPrevented, true)
  assert.equal(closeCount, 2)
})

for (const surface of [
  {
    label: 'detail drawer',
    file: 'src/admin/components/user-control/UserControlDetailDrawer.vue',
    props: {
      open: false,
      user: { id: 'user-a', username: 'A very long detail drawer title' },
      rules: {},
      ruleHistory: [],
      operationLogs: [],
      executionLogs: []
    },
    testId: null,
    role: 'dialog',
    enterClass: 'dialog-drawer-enter-from',
    closeEvent: 'onClose'
  },
  {
    label: 'MFA',
    file: 'src/admin/components/MfaVerificationModal.vue',
    props: {
      open: false,
      title: '安全验证',
      description: '请输入验证码',
      loading: false,
      error: '',
      errorAttempt: 0
    },
    testId: 'mfa-dialog-frame',
    enterClass: 'dialog-panel-enter-from',
    closeEvent: 'onUpdate:open'
  }
]) {
  test(`${surface.label} SFC runs its panel enter transition on first render`, async (t) => {
    const component = await loadVueSfc(projectFile(surface.file))
    let harness
    const listeners = surface.closeEvent === 'onUpdate:open'
      ? { 'onUpdate:open': (open) => { harness.props.open = open } }
      : { onClose: () => { harness.props.open = false } }
    harness = await createSfcHarness(component, surface.props, listeners)
    t.after(harness.cleanup)

    harness.props.open = true
    await harness.flush()
    const frame = surface.testId
      ? harness.findByTestId(surface.testId)
      : harness.allNodes().find((node) => node.getAttribute?.('role') === surface.role)

    assert.ok(frame)
    assert.equal(frame.classList.contains(surface.enterClass), true)
    await harness.finishTransitions()
    harness.findByText('×', 'button')?.click()
    await harness.flush()
  })
}

test('setting SFC blocks a second submit while its 150ms close transition is still running', async (t) => {
  const component = await loadVueSfc(projectFile('src/admin/components/user-control/UserControlModal.vue'))
  let submitCount = 0
  let harness
  harness = await createSfcHarness(component, {
    open: true,
    scope: 'global',
    user: { id: 'user-a', username: 'Alpha', email: 'alpha@example.test' },
    existingRules: {}
  }, {
    onSubmit: () => {
      submitCount += 1
      harness.props.open = false
    }
  })
  t.after(harness.cleanup)
  await harness.finishTransitions()

  const note = harness.allNodes().find((node) => node.tag === 'textarea')
  note.value = 'closing duplicate guard'
  note.dispatchEvent({ type: 'input', target: note })
  await harness.flush()

  const submit = harness.findByText('确认设置', 'button')
  submit.click()
  await harness.flush()
  assert.equal(submitCount, 1)
  assert.equal(submit.isConnected, true)

  submit.click()
  assert.equal(submitCount, 1)
})

test('setting SFC resets queued reopen B from B props instead of the leaving A snapshot', async (t) => {
  const component = await loadVueSfc(projectFile('src/admin/components/user-control/UserControlModal.vue'))
  const userA = { id: 'user-a', username: 'Alpha', email: 'alpha@example.test' }
  const userB = { id: 'user-b', username: 'Beta', email: 'beta@example.test' }
  const rulesA = {
    spot: { strategy: 'positive', value: 'profit', duration: 'permanent', status: 'active' }
  }
  const rulesB = {
    portfolio: { strategy: 'negative', value: 'lowYield', duration: 'once', status: 'active' }
  }
  let harness
  harness = await createSfcHarness(component, {
    open: true,
    scope: 'module',
    moduleKey: 'spot',
    user: userA,
    existingRules: rulesA
  }, {
    onClose: () => { harness.props.open = false }
  })
  t.after(harness.cleanup)
  await harness.finishTransitions()

  const frame = harness.findByTestId('user-control-dialog-frame')
  const close = harness.allNodes().find((node) => (
    node.getAttribute?.('aria-label') === '关闭' && frame.contains(node)
  ))
  close.click()
  harness.props.user = userB
  harness.props.moduleKey = 'portfolio'
  harness.props.existingRules = rulesB
  harness.props.open = true
  await harness.flush()

  await harness.finishTransitions()
  await harness.finishTransitions()

  const lowYield = harness.allNodes().find((node) => (
    node.tag === 'input' && node.getAttribute?.('name') === 'value' && node.value === 'lowYield'
  ))
  const once = harness.allNodes().find((node) => (
    node.tag === 'input' && node.getAttribute?.('name') === 'duration' && node.value === 'once'
  ))

  assert.ok(lowYield)
  assert.equal(lowYield.checked, true)
  assert.equal(once.checked, true)
  assert.match(harness.findByTestId('user-control-target-user').textContent, /Beta/)
})

test('module cancellation SFC runs both enter transitions for its local dialog', async (t) => {
  const component = await loadVueSfc(projectFile('src/pages/admin/user-control/ModuleUserControlPage.vue'))
  const harness = await createSfcHarness(component, { moduleKey: 'spot' })
  t.after(harness.cleanup)

  const cancel = harness.allNodes().find((node) => (
    node.tag === 'button' && node.textContent.trim() === '取消' && !node.disabled
  ))
  assert.ok(cancel)
  cancel.click()
  await harness.flush()

  const frame = harness.findByTestId('module-user-control-cancel-dialog')
  assert.ok(frame)
  assert.equal(frame.parent.classList.contains('dialog-overlay-enter-from'), true)
  assert.equal(frame.classList.contains('dialog-panel-enter-from'), true)
})

test('unified cancellation SFC runs both enter transitions for its local dialog', async (t) => {
  const component = await loadVueSfc(projectFile('src/pages/admin/user/UserListPage.vue'))
  const harness = await createSfcHarness(component)
  t.after(harness.cleanup)
  await new Promise((resolvePromise) => setTimeout(resolvePromise, 320))
  await harness.flush()

  const operation = harness.findByText('操作', 'button')
  assert.ok(operation)
  operation.click()
  await harness.flush()
  const cancel = harness.findByText('取消点控', 'button')
  assert.ok(cancel)
  cancel.click()
  await harness.flush()

  const frame = harness.findByTestId('unified-user-control-cancel-dialog')
  assert.ok(frame)
  assert.equal(frame.parent.classList.contains('dialog-overlay-enter-from'), true)
  assert.equal(frame.classList.contains('dialog-panel-enter-from'), true)
})

test('unified cancellation returns focus to the stable row action after its menu item unmounts', async (t) => {
  const component = await loadVueSfc(projectFile('src/pages/admin/user/UserListPage.vue'))
  const harness = await createSfcHarness(component)
  t.after(harness.cleanup)
  await new Promise((resolvePromise) => setTimeout(resolvePromise, 320))
  await harness.flush()

  const operation = harness.findByText('操作', 'button')
  operation.focus()
  operation.click()
  await harness.flush()
  const cancel = harness.findByText('取消点控', 'button')
  cancel.focus()
  cancel.click()
  await harness.flush()
  await harness.finishTransitions()

  const frame = harness.findByTestId('unified-user-control-cancel-dialog')
  const close = harness.allNodes().find((node) => (
    node.getAttribute?.('aria-label') === '关闭' && frame.contains(node)
  ))
  close.focus()
  close.click()
  await harness.flush()
  await harness.finishTransitions()

  assert.equal(harness.document.activeElement, operation)
})

for (const surface of [
  {
    label: 'setting dialog',
    file: 'src/admin/components/user-control/UserControlModal.vue',
    props: {
      open: true,
      scope: 'global',
      user: { id: 'user-a', username: 'A'.repeat(160), email: `${'a'.repeat(120)}@example.test` },
      existingRules: {}
    },
    testId: 'user-control-dialog-frame'
  },
  {
    label: 'detail drawer',
    file: 'src/admin/components/user-control/UserControlDetailDrawer.vue',
    props: {
      open: true,
      user: { id: 'user-a', username: 'A'.repeat(160), email: `${'a'.repeat(120)}@example.test` },
      rules: {},
      ruleHistory: [],
      operationLogs: [],
      executionLogs: []
    }
  }
]) {
  test(`${surface.label} keeps long header text shrinkable without shrinking its close target`, async (t) => {
    const component = await loadVueSfc(projectFile(surface.file))
    const harness = await createSfcHarness(component, surface.props)
    t.after(harness.cleanup)

    const frame = surface.testId
      ? harness.findByTestId(surface.testId)
      : harness.allNodes().find((node) => node.getAttribute?.('role') === 'dialog')
    const header = frame.children.find((node) => node.tag === 'header')
    const text = header.children.find((node) => node.tag === 'div')
    const title = harness.allNodes().find((node) => node.tag === 'h2' && header.contains(node))
    const close = header.children.find((node) => node.getAttribute?.('aria-label') === '关闭')

    assert.equal(header.classList.contains('shrink-0'), true)
    assert.equal(text.classList.contains('min-w-0'), true)
    assert.equal(text.classList.contains('flex-1'), true)
    assert.equal(title.classList.contains('break-words'), true)
    assert.equal(close.classList.contains('shrink-0'), true)
    assert.equal(close.classList.contains('min-h-11'), true)
    assert.equal(close.classList.contains('min-w-11'), true)
  })
}
