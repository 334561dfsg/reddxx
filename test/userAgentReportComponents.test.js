import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import { resolve } from 'node:path'
import test from 'node:test'
import { createSfcHarness, loadVueSfc, loadVueSfcModuleUrl } from './helpers/vueSfcHarness.js'

const projectFile = (path) => resolve(process.cwd(), path)
const drawerFile = projectFile('src/admin/components/user/UserAgentReportDrawer.vue')
const paginationFile = projectFile('src/admin/components/CompactPagination.vue')
const user = { id: 'user_agent_1', username: 'agent_alpha', role: 'agent' }
const productLines = [
  { key: 'deposit', label: '充值', volume: 120000, commission: 3200, orderCount: 18 },
  { key: 'perpetual', label: '永续合约', volume: 260000, commission: 8500, orderCount: 42 }
]
const dailyRows = Array.from({ length: 21 }, (_, index) => ({
  date: `2026-07-${String(25 - index).padStart(2, '0')}`,
  volume: 100000 + index,
  activeClients: 20 + index,
  newClients: index % 5,
  orderCount: 30 + index,
  commission: 5000 + index
}))
const report = {
  userId: user.id,
  summary: {
    directClientCount: 48,
    activeClientCount: 31,
    totalVolume: 380000,
    totalCommission: 11700
  },
  productLines,
  dailyRows
}

const loadDrawer = async () => loadVueSfc(drawerFile, {
  vueImports: { [paginationFile]: loadVueSfcModuleUrl(paginationFile) }
})

const dailyDates = (harness) => harness.allNodes()
  .filter((node) => node.getAttribute?.('data-testid') === 'agent-report-daily-row')
  .map((node) => node.textContent.match(/2026-07-\d{2}/)?.[0])

test('agent report Drawer renders four summary cards, every product line, and ten daily rows per page', async (t) => {
  const component = await loadDrawer()
  const harness = await createSfcHarness(component, { visible: true, user, report, error: '' })
  t.after(harness.cleanup)
  await harness.finishTransitions()

  const drawer = harness.findByTestId('user-agent-report-drawer')
  assert.ok(drawer)
  assert.equal(drawer.getAttribute('role'), 'dialog')
  assert.equal(drawer.getAttribute('aria-modal'), 'true')
  for (const label of ['直属客户数', '活跃客户数', '累计业务量', '累计佣金']) {
    assert.match(drawer.textContent, new RegExp(label))
  }
  assert.equal(harness.allNodes().filter((node) => node.getAttribute?.('data-testid') === 'agent-report-summary-card').length, 4)
  assert.deepEqual(
    harness.allNodes()
      .filter((node) => node.getAttribute?.('data-testid') === 'agent-report-product-row')
      .map((node) => productLines.find((line) => node.textContent.includes(line.label))?.key),
    ['deposit', 'perpetual']
  )
  assert.match(harness.allNodes().find((node) => node.getAttribute?.('data-testid') === 'agent-report-product-row').textContent, /业务量/)
  assert.deepEqual(dailyDates(harness), dailyRows.slice(0, 10).map((row) => row.date))
  assert.match(harness.allNodes().find((node) => node.getAttribute?.('data-testid') === 'agent-report-daily-row').textContent, /业务量/)
  assert.match(drawer.textContent, /代理业绩明细/)
  assert.equal(harness.findByTestId('compact-pagination-summary')?.textContent.trim(), '共 21 条 · 第 1 / 3 页')

  harness.findByText('下一页', 'button').click()
  await harness.flush()
  assert.deepEqual(dailyDates(harness), dailyRows.slice(10, 20).map((row) => row.date))
  assert.equal(harness.findByTestId('compact-pagination-summary')?.textContent.trim(), '共 21 条 · 第 2 / 3 页')

  harness.props.report = { ...report, dailyRows: dailyRows.slice(0, 3) }
  await harness.flush()
  assert.deepEqual(dailyDates(harness), dailyRows.slice(0, 3).map((row) => row.date))
  assert.equal(harness.findByTestId('compact-pagination-summary')?.textContent.trim(), '共 3 条 · 第 1 / 1 页')
})

test('agent report Drawer uses approved empty copy for each report section', async (t) => {
  const component = await loadDrawer()
  const harness = await createSfcHarness(component, {
    visible: true,
    user,
    report: { ...report, productLines: [], dailyRows: [] },
    error: ''
  })
  t.after(harness.cleanup)
  await harness.finishTransitions()

  const drawer = harness.findByTestId('user-agent-report-drawer')
  assert.match(drawer.textContent, /暂无产品线汇总/)
  assert.match(drawer.textContent, /暂无代理业绩明细/)
})

test('agent report Drawer keeps agent-specific empty and loading-error feedback inside the open layer', async (t) => {
  const component = await loadDrawer()
  const harness = await createSfcHarness(component, { visible: true, user, report: null, error: '' })
  t.after(harness.cleanup)
  await harness.finishTransitions()

  const drawer = harness.findByTestId('user-agent-report-drawer')
  assert.match(drawer.textContent, /当前代理暂无业务报表数据/)
  assert.match(drawer.textContent, /该代理尚无可统计的客户与佣金记录/)

  harness.props.error = '报表服务暂时不可用'
  await harness.flush()
  const alert = harness.allNodes().find((node) => node.getAttribute?.('role') === 'alert')
  assert.ok(alert)
  assert.match(alert.textContent, /代理报表加载失败/)
  assert.match(alert.textContent, /报表服务暂时不可用/)
  assert.equal(drawer.isConnected, true)
})

test('agent report Drawer resists backdrop clicks, closes intentionally, and restores focus after motion', async (t) => {
  const component = await loadDrawer()
  const trigger = { isConnected: true, focused: false, focus() { this.focused = true } }
  let closeCount = 0
  let harness
  harness = await createSfcHarness(component, { visible: true, user, report, error: '', returnFocus: trigger }, {
    onClose: () => { closeCount += 1; harness.props.visible = false }
  })
  t.after(harness.cleanup)
  await harness.finishTransitions()

  const drawer = harness.findByTestId('user-agent-report-drawer')
  drawer.parent.click()
  await harness.flush()
  assert.equal(closeCount, 0)

  const close = harness.allNodes().find((node) => drawer.contains(node) && node.getAttribute?.('aria-label') === '关闭')
  assert.ok(close)
  close.click()
  await harness.flush()
  assert.equal(closeCount, 1)
  assert.equal(drawer.isConnected, true)
  await harness.finishTransitions()
  assert.equal(trigger.focused, true)
})

test('agent report Drawer preserves a newer context through an older leave callback and returns focus once', async (t) => {
  const component = await loadDrawer()
  const nextUser = { id: 'user_agent_2', username: 'agent_beta', role: 'agent' }
  const nextReport = {
    userId: nextUser.id,
    summary: { directClientCount: 92, activeClientCount: 73, totalVolume: 910000, totalCommission: 28000 },
    productLines: [{ key: 'borrowing', label: '借贷产品', volume: 910000, commission: 28000, orderCount: 77 }],
    dailyRows: [{ date: '2026-07-26', volume: 910000, activeClients: 73, newClients: 8, orderCount: 77, commission: 28000 }]
  }
  const firstTrigger = { isConnected: true, focusCount: 0, focus() { this.focusCount += 1 } }
  const nextTrigger = { isConnected: true, focusCount: 0, focus() { this.focusCount += 1 } }
  let closedCount = 0
  let harness
  harness = await createSfcHarness(component, { visible: true, user, report, error: '', returnFocus: firstTrigger }, {
    onClose: () => { harness.props.visible = false },
    onClosed: () => {
      closedCount += 1
      harness.props.user = null
      harness.props.report = null
      harness.props.error = ''
      harness.props.returnFocus = null
    }
  })
  t.after(harness.cleanup)
  await harness.finishTransitions()

  const firstDrawer = harness.findByTestId('user-agent-report-drawer')
  harness.allNodes().find((node) => firstDrawer.contains(node) && node.getAttribute?.('aria-label') === '关闭').click()
  await harness.flush()

  harness.props.user = nextUser
  harness.props.report = nextReport
  harness.props.error = '新代理上下文提示'
  harness.props.returnFocus = nextTrigger
  harness.props.visible = true
  await harness.flush()
  await harness.finishTransitions()
  await harness.finishTransitions()

  const survivingDrawers = harness.allNodes().filter((node) => node.getAttribute?.('data-testid') === 'user-agent-report-drawer')
  assert.equal(survivingDrawers.length, 1)
  assert.match(survivingDrawers[0].textContent, /agent_beta/)
  assert.match(survivingDrawers[0].textContent, /借贷产品/)
  assert.match(survivingDrawers[0].textContent, /新代理上下文提示/)
  assert.equal(harness.document.body.style.overflow, 'hidden')
  assert.equal(firstTrigger.focusCount, 0)
  assert.equal(nextTrigger.focusCount, 0)
  assert.equal(closedCount, 0)

  harness.allNodes().find((node) => survivingDrawers[0].contains(node) && node.getAttribute?.('aria-label') === '关闭').click()
  await harness.flush()
  await harness.finishTransitions()
  assert.equal(closedCount, 1)
  assert.equal(firstTrigger.focusCount, 0)
  assert.equal(nextTrigger.focusCount, 1)
})

test('agent report Drawer uses the shared fixed layer, one body scroller, and required motion safeguards', async () => {
  const source = await readFile(drawerFile, 'utf8')

  assert.match(source, /useDialogLifecycle/)
  assert.match(source, /:style="layerStyle"/)
  assert.match(source, /class="fixed inset-0/)
  assert.match(source, /data-testid="user-agent-report-body"[^>]*overflow-y-auto/)
  assert.equal((source.match(/overflow-y-auto/g) || []).length, 1)
  assert.match(source, /overflow-hidden/)
  assert.match(source, /aria-label="关闭"/)
  assert.match(source, /200ms ease-out/)
  assert.match(source, /150ms ease-in/)
  assert.match(source, /prefers-reduced-motion: reduce/)
  assert.match(source, /transition-duration: 50ms/)
  assert.match(source, /transform: none/)
  assert.match(source, /100vh/)
  assert.match(source, /100dvh/)
  assert.match(source, /safe-area-inset-top/)
  assert.match(source, /safe-area-inset-right/)
  assert.match(source, /safe-area-inset-bottom/)
  assert.match(source, /safe-area-inset-left/)
  assert.doesNotMatch(source, /@click\.self|@mousedown\.self|@touchend\.self/)
})
