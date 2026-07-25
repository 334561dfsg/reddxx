import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import { resolve } from 'node:path'
import test from 'node:test'
import { createSfcHarness, loadVueSfc } from './helpers/vueSfcHarness.js'

const projectFile = (path) => resolve(process.cwd(), path)
const rechargeDrawerFile = projectFile('src/admin/components/user/UserRechargeSummaryDrawer.vue')

const user = { id: 'user_1004', username: 'user_chen', vipLevel: 1 }
const summary = {
  cumulativeRecharge: 170000,
  qualifyingRecharge: 160000,
  currentVipLevel: 1,
  nextLevel: { level: 2, name: 'VIP2', displayName: '白银会员', targetRecharge: 300000, remainingRecharge: 140000, progressPercent: 53.33 },
  records: [
    { id: 'r1', amount: 125000, qualifyingAmount: 120000, source: '链上充值', transactionId: 'DEP-001', createdAt: '2026-06-18T08:30:00.000Z' }
  ]
}

test('recharge Drawer opens above its trigger, exposes the complete summary, and closes intentionally', async (t) => {
  const component = await loadVueSfc(rechargeDrawerFile)
  const trigger = {
    isConnected: true,
    focused: false,
    focus() { this.focused = true }
  }
  let closeCount = 0
  let harness
  harness = await createSfcHarness(component, { visible: false, user, summary, returnFocus: trigger }, {
    onClose: () => { closeCount += 1; harness.props.visible = false }
  })
  t.after(harness.cleanup)

  harness.props.visible = true
  await harness.flush()
  const frame = harness.findByTestId('user-recharge-summary-drawer')
  assert.ok(frame)
  assert.equal(frame.getAttribute('role'), 'dialog')
  assert.equal(frame.getAttribute('aria-modal'), 'true')
  assert.match(frame.textContent, /170,000\.00/)
  assert.match(frame.textContent, /160,000\.00/)
  assert.match(frame.textContent, /VIP2/)
  assert.match(frame.textContent, /DEP-001/)
  assert.equal(frame.parent.classList.contains('recharge-drawer-enter-from'), true)

  await harness.finishTransitions()
  frame.parent.click()
  await harness.flush()
  assert.equal(closeCount, 0)

  const close = harness.allNodes().find((node) => frame.contains(node) && node.getAttribute?.('aria-label') === '关闭')
  assert.ok(close)
  close.click()
  await harness.flush()
  assert.equal(closeCount, 1)
  assert.equal(frame.isConnected, true)
  await harness.finishTransitions()
  assert.equal(trigger.focused, true)
})

test('recharge Drawer has one body scroller and responsive motion safeguards', async () => {
  const source = await readFile(rechargeDrawerFile, 'utf8')

  assert.match(source, /data-testid="user-recharge-summary-body"[^>]*overflow-y-auto/)
  assert.equal((source.match(/overflow-y-auto/g) || []).length, 1)
  assert.match(source, /overflow-hidden/)
  assert.match(source, /200ms ease-out/)
  assert.match(source, /150ms ease-in/)
  assert.match(source, /prefers-reduced-motion: reduce/)
  assert.match(source, /transition-duration: 50ms/)
  assert.match(source, /transform: none/)
  assert.match(source, /100vh/)
  assert.match(source, /100dvh/)
  assert.match(source, /safe-area-inset-right/)
  assert.doesNotMatch(source, /@click\.self|@mousedown\.self|@touchend\.self/)
})
