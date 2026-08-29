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
    delivery: { strategy: 'positive', method: 'profit', value: 'profit', duration: 'permanent', status: 'active' }
  }
  const rulesB = {
    delivery: { strategy: 'negative', method: 'loss', value: 'loss', duration: 'permanent', status: 'active' }
  }
  let harness
  harness = await createSfcHarness(component, {
    open: true,
    scope: 'module',
    moduleKey: 'delivery',
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
  harness.props.moduleKey = 'delivery'
  harness.props.existingRules = rulesB
  harness.props.open = true
  await harness.flush()

  await harness.finishTransitions()
  await harness.finishTransitions()

  const body = harness.findByTestId('user-control-dialog-body')
  assert.match(body.textContent, /交割点控规则/)
  assert.doesNotMatch(body.textContent, /投资组合点控规则/)
  assert.doesNotMatch(body.textContent, /当前选择：亏损/)
  assert.doesNotMatch(body.textContent, /当前选择说明/)
  assert.match(harness.findByTestId('user-control-target-user').textContent, /Beta/)
})

test('module cancellation SFC runs both enter transitions for its local dialog', async (t) => {
  const component = await loadVueSfc(projectFile('src/pages/admin/user-control/ModuleUserControlPage.vue'))
  const harness = await createSfcHarness(component, { moduleKey: 'delivery' })
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

test('user operation Drawer runs both right-edge enter transitions', async (t) => {
  const component = await loadVueSfc(projectFile('src/admin/components/user/UserOperationDrawer.vue'))
  const harness = await createSfcHarness(component, {
    visible: false,
    user: { id: 'user-a', username: 'Alpha', status: 'active' }
  }, {
    onClose: () => { harness.props.visible = false }
  })
  t.after(harness.cleanup)

  harness.props.visible = true
  await harness.flush()
  const frame = harness.findByTestId('user-operation-drawer')
  assert.ok(frame)
  assert.equal(frame.parent.classList.contains('drawer-overlay-enter-from'), true)
  assert.equal(frame.classList.contains('drawer-panel-enter-from'), true)
})

test('user operation Drawer returns focus to the stable row action after close', async (t) => {
  const component = await loadVueSfc(projectFile('src/admin/components/user/UserOperationDrawer.vue'))
  let harness
  harness = await createSfcHarness(component, {
    visible: false,
    user: { id: 'user-a', username: 'Alpha', status: 'active' },
    returnFocus: null
  }, {
    onClose: () => { harness.props.visible = false }
  })
  t.after(harness.cleanup)

  const operation = harness.allNodes().find((node) => node.tag === 'main')
  operation.focus()
  harness.props.returnFocus = operation
  harness.props.visible = true
  await harness.flush()
  await harness.finishTransitions()

  const frame = harness.findByTestId('user-operation-drawer')
  const close = harness.allNodes().find((node) => (
    node.getAttribute?.('aria-label') === '关闭' && frame.contains(node)
  ))
  close.focus()
  close.click()
  await harness.flush()
  await harness.finishTransitions()

  assert.equal(harness.document.activeElement, operation)
})

test('user detail Drawer reopens on the requested overview or assets tab', async (t) => {
  const component = await loadVueSfc(projectFile('src/admin/components/user/UserDetailDrawer.vue'))
  let harness
  harness = await createSfcHarness(component, {
    visible: true,
    initialTab: 'overview',
    user: {
      id: 'user-159',
      username: 'Alpha',
      email: 'alpha@example.test',
      role: 'user',
      status: 'active',
      kycStatus: 'verified',
      vipLevel: 2,
      creditScore: 680,
      parentUsername: 'Fission Parent',
      balance: 1200,
      frozenBalance: 80
    }
  }, {
    onClose: () => { harness.props.visible = false }
  })
  t.after(harness.cleanup)
  await harness.finishTransitions()

  assert.ok(harness.findByText('账户信息'))
  assert.ok(harness.findByText('裂变上级'))
  assert.ok(harness.findByText('Fission Parent'))
  const frame = harness.findByTestId('user-detail-drawer')
  const close = harness.allNodes().find((node) => (
    node.getAttribute?.('aria-label') === '关闭' && frame.contains(node)
  ))
  close.click()
  await harness.flush()
  await harness.finishTransitions()

  harness.props.initialTab = 'assets'
  harness.props.visible = true
  await harness.flush()
  await harness.finishTransitions()

  assert.ok(harness.findByText('账户资产'))
})

test('user card exposes its parent as a fission relationship', async (t) => {
  const component = await loadVueSfc(projectFile('src/admin/components/UserCard.vue'))
  const harness = await createSfcHarness(component, {
    user: {
      id: 'user-card-child',
      username: 'Child',
      email: 'child@example.test',
      status: 'active',
      role: 'user',
      kycStatus: 'verified',
      creditScore: 680,
      balance: 100,
      frozenBalance: 0,
      totalProfit: 0,
      tradingVolume: 0,
      parentUsername: 'Fission Parent',
      phone: '13000000000',
      registerTime: '2026-01-01T00:00:00.000Z',
      lastLoginTime: '2026-01-02T00:00:00.000Z',
      lastLoginIp: '127.0.0.1'
    }
  })
  t.after(harness.cleanup)

  assert.ok(harness.findByText('裂变上级'))
  assert.ok(harness.findByText('Fission Parent'))
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
