import assert from 'node:assert/strict'
import { existsSync, readFileSync } from 'node:fs'
import { pathToFileURL } from 'node:url'
import { resolve } from 'node:path'
import test from 'node:test'
import { createSfcHarness, loadVueSfc, loadVueSfcModuleUrl } from './helpers/vueSfcHarness.js'
import { getLatestDialogLifecycle } from './helpers/userControlLogDrawerLifecycleHarness.js'

const drawerFile = resolve(process.cwd(), 'src/admin/components/user-control/UserControlLogDrawer.vue')
const contentFile = resolve(process.cwd(), 'src/admin/components/user-control/UserControlLogContent.vue')
const lifecycleFile = resolve(process.cwd(), 'src/admin/composables/useDialogLifecycle.js')
const lifecycleHarnessFile = resolve(process.cwd(), 'test/helpers/userControlLogDrawerLifecycleHarness.js')
const user = { id: 'user_1001', username: 'agent_wang' }

const loadDrawer = async () => {
  assert.equal(existsSync(drawerFile), true, 'UserControlLogDrawer.vue must exist')
  return loadVueSfc(drawerFile, {
    vueImports: {
      [contentFile]: loadVueSfcModuleUrl(contentFile),
      [lifecycleFile]: pathToFileURL(lifecycleHarnessFile).href
    }
  })
}

const mountDrawer = async ({ visible = true, user: selectedUser = user, returnFocus = null } = {}, listeners = {}) => {
  const component = await loadDrawer()
  let harness
  harness = await createSfcHarness(component, { visible, user: selectedUser, returnFocus }, {
    onClose: () => {
      listeners.onClose?.()
      harness.props.visible = false
    },
    onClosed: () => listeners.onClosed?.()
  })
  return harness
}

const closeButton = (harness, drawer) => harness.allNodes().find((node) => (
  drawer.contains(node) && node.getAttribute?.('aria-label') === '关闭'
))

test('log Drawer identifies the selected user and ignores backdrop clicks', async (t) => {
  let closeCount = 0
  const harness = await mountDrawer({}, { onClose: () => { closeCount += 1 } })
  t.after(harness.cleanup)
  await harness.finishTransitions()

  const drawer = harness.findByTestId('user-control-log-drawer')
  assert.equal(drawer.getAttribute('role'), 'dialog')
  assert.equal(drawer.getAttribute('aria-modal'), 'true')
  assert.match(drawer.textContent, /agent_wang · UID user_1001/)
  assert.equal((drawer.textContent.match(/用户点控日志/g) || []).length, 1)
  assert.ok(harness.findByTestId('user-control-log-content'), 'the real log content is rendered')
  drawer.parent.click()
  await harness.flush()
  assert.equal(closeCount, 0)
})

test('intentional close unmounts before cleanup and returns focus once', async (t) => {
  let harness
  const trigger = {
    isConnected: true,
    focusCount: 0,
    focus() {
      this.focusCount += 1
      harness.document.eventLog.push({ type: 'return-focus' })
    }
  }
  let closedCount = 0
  harness = await mountDrawer({ returnFocus: trigger }, {
    onClosed: () => {
      closedCount += 1
      harness.document.eventLog.push({ type: 'closed' })
    }
  })
  t.after(harness.cleanup)
  await harness.finishTransitions()

  const drawer = harness.findByTestId('user-control-log-drawer')
  harness.document.eventLog.length = 0
  closeButton(harness, drawer).click()
  await harness.flush()
  assert.equal(drawer.isConnected, true, 'the frame remains until leave motion completes')
  await harness.finishTransitions()

  const events = harness.document.eventLog
  const removalIndex = events.findIndex((event) => event.type === 'dom-remove' && event.node.contains?.(drawer))
  const trapReleaseIndex = events.findIndex((event) => event.type === 'listener-removed' && event.listenerType === 'keydown')
  const backgroundReleaseIndex = events.findIndex((event) => event.type === 'inert' && event.node === harness.root && event.value === false)
  const scrollReleaseIndex = events.findIndex((event) => event.type === 'scroll-lock' && event.target === 'body' && event.value === '')
  const focusIndex = events.findIndex((event) => event.type === 'return-focus')
  const closedIndex = events.findIndex((event) => event.type === 'closed')

  assert.ok(removalIndex >= 0)
  assert.ok(trapReleaseIndex > removalIndex)
  assert.ok(backgroundReleaseIndex > trapReleaseIndex)
  assert.ok(scrollReleaseIndex > backgroundReleaseIndex)
  assert.ok(focusIndex > scrollReleaseIndex)
  assert.ok(closedIndex > focusIndex)
  assert.equal(trigger.focusCount, 1)
  assert.equal(closedCount, 1)
})

test('root leave transition keeps the log panel mounted while applying its right-edge exit state', async (t) => {
  const harness = await mountDrawer()
  t.after(harness.cleanup)
  await harness.finishTransitions()

  const drawer = harness.findByTestId('user-control-log-drawer')
  closeButton(harness, drawer).click()
  await harness.flush()

  const overlay = drawer.parent
  assert.equal(drawer.isConnected, true)
  assert.equal(overlay.classList.contains('user-control-log-drawer-leave-active'), true)
  assert.equal(overlay.contains(drawer), true)
})

test('Escape closes only after entry and Tab remains trapped in the open Drawer', async (t) => {
  let closeCount = 0
  const harness = await mountDrawer({}, { onClose: () => { closeCount += 1 } })
  t.after(harness.cleanup)

  const prematureEscape = harness.keydown('Escape')
  assert.equal(prematureEscape.defaultPrevented, false)
  assert.equal(closeCount, 0)
  await harness.finishTransitions()

  const drawer = harness.findByTestId('user-control-log-drawer')
  const focusable = harness.allNodes().filter((node) => drawer.contains(node) && node.tabIndex >= 0 && !node.disabled)
  assert.ok(focusable.length > 1)
  focusable.at(-1).focus()
  const tab = harness.keydown('Tab')
  assert.equal(tab.defaultPrevented, true)
  assert.equal(harness.document.activeElement, focusable[0])

  const escape = harness.keydown('Escape')
  await harness.flush()
  assert.equal(escape.defaultPrevented, true)
  assert.equal(closeCount, 1)
})

test('closing frame keeps its cloned user identity and fixed UID until the next opening phase', async (t) => {
  const userA = { ...user }
  const userB = { id: 'user_2002', username: 'agent_li' }
  const harness = await mountDrawer({ user: userA })
  t.after(harness.cleanup)
  await harness.finishTransitions()

  const drawer = harness.findByTestId('user-control-log-drawer')
  assert.match(drawer.textContent, /agent_wang · UID user_1001/)
  assert.match(drawer.textContent, /demo-batch-user-1001/)

  getLatestDialogLifecycle().phase.value = 'closing'
  await harness.flush()
  harness.props.user.id = userB.id
  harness.props.user.username = userB.username
  await harness.flush()

  assert.match(drawer.textContent, /agent_wang · UID user_1001/)
  assert.doesNotMatch(drawer.textContent, /agent_li · UID user_2002/)
  assert.match(drawer.textContent, /demo-batch-user-1001/)

  getLatestDialogLifecycle().phase.value = 'opening'
  await harness.flush()
  assert.match(drawer.textContent, /agent_li · UID user_2002/)
  assert.doesNotMatch(drawer.textContent, /demo-batch-user-1001/)
})

test('a newer user context survives an older leave callback without stale cleanup', async (t) => {
  const userA = { ...user }
  const userB = { id: 'user_2002', username: 'agent_li' }
  const firstTrigger = { isConnected: true, focusCount: 0, focus() { this.focusCount += 1 } }
  const nextTrigger = { isConnected: true, focusCount: 0, focus() { this.focusCount += 1 } }
  let closedCount = 0
  const harness = await mountDrawer({ user: userA, returnFocus: firstTrigger }, {
    onClosed: () => { closedCount += 1 }
  })
  t.after(harness.cleanup)
  await harness.finishTransitions()

  const firstDrawer = harness.findByTestId('user-control-log-drawer')
  assert.match(firstDrawer.textContent, /agent_wang · UID user_1001/)
  assert.match(firstDrawer.textContent, /demo-batch-user-1001/)
  closeButton(harness, firstDrawer).click()
  await harness.flush()
  harness.props.user.id = userB.id
  harness.props.user.username = userB.username
  await harness.flush()

  assert.equal(firstDrawer.isConnected, true, 'user A remains mounted through its leave motion')
  assert.match(firstDrawer.textContent, /agent_wang · UID user_1001/)
  assert.doesNotMatch(firstDrawer.textContent, /agent_li · UID user_2002/)
  assert.match(firstDrawer.textContent, /demo-batch-user-1001/)

  harness.props.user = userB
  harness.props.returnFocus = nextTrigger
  harness.props.visible = true
  await harness.flush()
  await harness.finishTransitions()
  await harness.finishTransitions()

  const drawers = harness.allNodes().filter((node) => node.getAttribute?.('data-testid') === 'user-control-log-drawer')
  assert.equal(drawers.length, 1)
  assert.match(drawers[0].textContent, /agent_li · UID user_2002/)
  assert.equal(closedCount, 0)
  assert.equal(harness.document.body.style.overflow, 'hidden')
  assert.equal(firstTrigger.focusCount, 0)
  assert.equal(nextTrigger.focusCount, 0)
})

test('log Drawer keeps a fixed frame, one body scroller, safe areas, and compliant motion', () => {
  assert.equal(existsSync(drawerFile), true, 'UserControlLogDrawer.vue must exist')
  const source = readFileSync(drawerFile, 'utf8')
  assert.match(source, /useDialogLifecycle/)
  assert.match(source, /:style="layerStyle"/)
  assert.match(source, /data-testid="user-control-log-drawer-body"[^>]*overflow-y-auto/)
  assert.equal((source.match(/overflow-y-auto/g) || []).length, 1)
  assert.match(source, /overflow-hidden/)
  assert.match(source, /100vh/)
  assert.match(source, /100dvh/)
  assert.match(source, /safe-area-inset-top/)
  assert.match(source, /safe-area-inset-right/)
  assert.match(source, /safe-area-inset-bottom/)
  assert.match(source, /safe-area-inset-left/)
  assert.match(source, /200ms ease-out/)
  assert.match(source, /150ms ease-in/)
  assert.match(source, /\.user-control-log-drawer-leave-active \.user-control-log-drawer-panel/)
  assert.match(source, /\.user-control-log-drawer-leave-to \.user-control-log-drawer-panel/)
  assert.doesNotMatch(source, /Transition name="user-control-log-drawer-panel"/)
  assert.match(source, /prefers-reduced-motion: reduce/)
  assert.match(source, /transition-duration: 50ms/)
  assert.match(source, /transform: none/)
  assert.doesNotMatch(source, /@click\.self|@mousedown\.self|@touchend\.self|@pointerup\.self/)
})
