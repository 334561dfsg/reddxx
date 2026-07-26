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

test('agent report Drawer keeps overview outside tabs and separates products from paged daily details', async (t) => {
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
  const overview = harness.findByTestId('agent-report-overview')
  const tablist = harness.findByTestId('agent-report-tablist')
  const productTab = harness.findByText('产品线汇总', 'button')
  const dailyTab = harness.findByText('业绩明细', 'button')
  const dailyPanel = harness.findByTestId('agent-report-daily-panel')
  const productPanel = harness.findByTestId('agent-report-products-panel')
  const productTable = harness.findByTestId('agent-report-product-table')
  const dailyHeader = harness.findByTestId('agent-report-daily-header')
  const pagination = harness.findByTestId('agent-report-pagination')
  const summaryCards = harness.allNodes().filter((node) => node.getAttribute?.('data-testid') === 'agent-report-summary-card')
  const renderedDailyRows = harness.allNodes().filter((node) => node.getAttribute?.('data-testid') === 'agent-report-daily-row')
  const paginationSummary = harness.findByTestId('compact-pagination-summary')
  assert.ok(overview)
  assert.ok(tablist)
  assert.ok(productTab)
  assert.ok(dailyTab)
  assert.ok(dailyPanel)
  assert.equal(productPanel, undefined)
  assert.equal(productTable, undefined)
  assert.ok(dailyHeader)
  assert.ok(pagination)
  assert.equal(tablist.getAttribute('role'), 'tablist')
  assert.equal(productTab.getAttribute('role'), 'tab')
  assert.equal(dailyTab.getAttribute('role'), 'tab')
  assert.equal(productTab.getAttribute('aria-selected'), 'false')
  assert.equal(dailyTab.getAttribute('aria-selected'), 'true')
  assert.equal(dailyPanel.getAttribute('role'), 'tabpanel')
  assert.equal(dailyPanel.getAttribute('aria-labelledby'), 'agent-report-daily-tab')
  assert.equal(dailyPanel.getAttribute('tabindex'), '0')
  assert.equal(dailyPanel.classList.contains('overflow-y-auto'), true)
  assert.equal(dailyPanel.classList.contains('focus-visible:ring-2'), true)
  assert.equal(overview.contains(summaryCards[0]), true)
  assert.equal(dailyPanel.contains(summaryCards[0]), false)
  assert.equal(dailyPanel.contains(dailyHeader), true)
  assert.equal(dailyPanel.contains(renderedDailyRows[0]), true)
  assert.equal(dailyPanel.contains(paginationSummary), false)
  assert.equal(pagination.contains(paginationSummary), true)
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

  productTab.click()
  await harness.flush()
  const activeProductPanel = harness.findByTestId('agent-report-products-panel')
  const activeDailyPanel = harness.findByTestId('agent-report-daily-panel')
  const activeProductTable = harness.findByTestId('agent-report-product-table')
  const productRows = harness.allNodes().filter((node) => node.getAttribute?.('data-testid') === 'agent-report-product-row')
  assert.ok(activeProductPanel)
  assert.equal(activeDailyPanel, undefined)
  assert.equal(harness.findByTestId('agent-report-pagination'), undefined)
  assert.equal(productTab.getAttribute('aria-selected'), 'true')
  assert.equal(dailyTab.getAttribute('aria-selected'), 'false')
  assert.equal(activeProductPanel.getAttribute('role'), 'tabpanel')
  assert.equal(activeProductPanel.getAttribute('aria-labelledby'), 'agent-report-products-tab')
  assert.equal(activeProductPanel.getAttribute('tabindex'), '0')
  assert.equal(activeProductPanel.classList.contains('overflow-y-auto'), true)
  assert.equal(activeProductTable.classList.contains('divide-y'), true)
  assert.equal(productRows[0].tag, 'tr')
  assert.deepEqual(
    productRows
      .map((node) => productLines.find((line) => node.textContent.includes(line.label))?.key),
    ['deposit', 'perpetual']
  )
  assert.match(activeProductTable.textContent, /业务量/)

  dailyTab.click()
  await harness.flush()
  assert.ok(harness.findByTestId('agent-report-daily-panel'))
  assert.ok(harness.findByTestId('agent-report-pagination'))
  assert.equal(harness.findByTestId('agent-report-products-panel'), undefined)
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
  assert.match(drawer.textContent, /暂无代理业绩明细/)
  const dailyPanel = harness.findByTestId('agent-report-daily-panel')
  const overview = harness.findByTestId('agent-report-overview')
  assert.ok(overview)
  assert.ok(dailyPanel)
  assert.match(dailyPanel.textContent, /暂无代理业绩明细/)
  assert.equal(dailyPanel.getAttribute('tabindex'), '0')
  assert.equal(harness.findByTestId('agent-report-pagination'), undefined)

  harness.findByText('产品线汇总', 'button').click()
  await harness.flush()
  const productsPanel = harness.findByTestId('agent-report-products-panel')
  assert.ok(productsPanel)
  assert.match(productsPanel.textContent, /暂无产品线汇总/)
  assert.equal(harness.findByTestId('agent-report-daily-panel'), undefined)
})

test('agent report Drawer uses one keyboard-accessible report scroller and compact fixed pagination', async (t) => {
  const component = await loadDrawer()
  const harness = await createSfcHarness(component, {
    visible: true,
    user,
    report,
    error: '代理报表请求失败，错误详情在浏览器缩放和窄视口下可能换行。'.repeat(8)
  })
  t.after(harness.cleanup)
  await harness.finishTransitions()

  const errorState = harness.findByTestId('agent-report-error-state')
  const dailyPanel = harness.findByTestId('agent-report-daily-panel')
  const pagination = harness.findByTestId('agent-report-pagination')
  assert.ok(errorState)
  assert.ok(pagination, 'the wrapped-error path retains its fixed pagination footer')
  assert.equal(errorState.classList.contains('shrink-0'), true)
  assert.equal(dailyPanel.classList.contains('min-h-0'), true)
  assert.equal(dailyPanel.classList.contains('flex-1'), true)
  assert.equal(dailyPanel.classList.contains('overflow-y-auto'), true)
  assert.equal(dailyPanel.getAttribute('tabindex'), '0')
})

test('agent report Drawer assigns bottom safe-area padding only to the flexible region without a footer', async (t) => {
  const component = await loadDrawer()
  const emptyHarness = await createSfcHarness(component, { visible: true, user, report: null, error: '' })
  const dailyEmptyHarness = await createSfcHarness(component, {
    visible: true,
    user,
    report: { ...report, dailyRows: [] },
    error: ''
  })
  const pagedHarness = await createSfcHarness(component, { visible: true, user, report, error: '' })
  t.after(emptyHarness.cleanup)
  t.after(dailyEmptyHarness.cleanup)
  t.after(pagedHarness.cleanup)
  await emptyHarness.finishTransitions()
  await dailyEmptyHarness.finishTransitions()
  await pagedHarness.finishTransitions()

  const safeBottomClass = 'pb-[max(1rem,env(safe-area-inset-bottom))]'
  const footerSafeBottomClass = 'pb-[max(0.75rem,env(safe-area-inset-bottom))]'
  const emptyState = emptyHarness.findByTestId('agent-report-empty-state')
  assert.ok(emptyState)
  assert.match(emptyState.getAttribute('class'), new RegExp(safeBottomClass.replace(/[()[\]]/g, '\\$&')))
  assert.equal(emptyState.getAttribute('tabindex'), null)
  assert.equal(emptyHarness.findByTestId('agent-report-pagination'), undefined)

  emptyHarness.props.error = '报表服务暂时不可用'
  await emptyHarness.flush()
  const errorState = emptyHarness.findByTestId('agent-report-error-state')
  assert.ok(errorState)
  assert.match(errorState.getAttribute('class'), new RegExp(safeBottomClass.replace(/[()[\]]/g, '\\$&')))
  assert.equal(errorState.getAttribute('tabindex'), '-1')
  assert.equal(emptyHarness.findByTestId('agent-report-pagination'), undefined)

  const dailyEmptyPanel = dailyEmptyHarness.findByTestId('agent-report-daily-panel')
  assert.match(dailyEmptyPanel.getAttribute('class'), new RegExp(safeBottomClass.replace(/[()[\]]/g, '\\$&')))
  assert.equal(dailyEmptyHarness.findByTestId('agent-report-pagination'), undefined)

  const pagedPanel = pagedHarness.findByTestId('agent-report-daily-panel')
  const pagination = pagedHarness.findByTestId('agent-report-pagination')
  assert.doesNotMatch(pagedPanel.getAttribute('class'), new RegExp(safeBottomClass.replace(/[()[\]]/g, '\\$&')))
  assert.match(pagination.getAttribute('class'), new RegExp(footerSafeBottomClass.replace(/[()[\]]/g, '\\$&')))
})

test('agent report Drawer clamps same-user data shrink but resets page for a new context', async (t) => {
  const component = await loadDrawer()
  const harness = await createSfcHarness(component, { visible: true, user, report, error: '' })
  t.after(harness.cleanup)
  await harness.finishTransitions()

  harness.findByText('下一页', 'button').click()
  await harness.flush()
  harness.findByText('下一页', 'button').click()
  await harness.flush()
  assert.equal(harness.findByTestId('compact-pagination-summary')?.textContent.trim(), '共 21 条 · 第 3 / 3 页')

  harness.props.report = { ...report, dailyRows: dailyRows.slice(0, 15) }
  await harness.flush()
  assert.equal(harness.findByTestId('compact-pagination-summary')?.textContent.trim(), '共 15 条 · 第 2 / 2 页')
  assert.deepEqual(dailyDates(harness), dailyRows.slice(10, 15).map((row) => row.date))

  harness.props.user = { id: 'user_agent_2', username: 'agent_beta', role: 'agent' }
  await harness.flush()
  assert.equal(harness.findByTestId('compact-pagination-summary')?.textContent.trim(), '共 15 条 · 第 1 / 2 页')
})

test('stable agent report close removes its DOM before releasing protections and returning focus once', async (t) => {
  const component = await loadDrawer()
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
  harness = await createSfcHarness(component, { visible: true, user, report, error: '', returnFocus: trigger }, {
    onClose: () => { harness.props.visible = false },
    onClosed: () => {
      closedCount += 1
      harness.document.eventLog.push({ type: 'closed' })
    }
  })
  t.after(harness.cleanup)
  await harness.finishTransitions()

  const drawer = harness.findByTestId('user-agent-report-drawer')
  harness.document.eventLog.length = 0
  harness.allNodes().find((node) => drawer.contains(node) && node.getAttribute?.('aria-label') === '关闭').click()
  await harness.flush()
  await harness.finishTransitions()

  const events = harness.document.eventLog
  const removalIndex = events.findIndex((event) => event.type === 'dom-remove' && event.node.contains?.(drawer))
  const trapReleaseIndex = events.findIndex((event) => event.type === 'listener-removed' && event.listenerType === 'keydown')
  const backgroundReleaseIndex = events.findIndex((event) => event.type === 'inert' && event.node === harness.root && event.value === false)
  const scrollReleaseIndex = events.findIndex((event) => event.type === 'scroll-lock' && event.target === 'body' && event.value === '')
  const focusIndex = events.findIndex((event) => event.type === 'return-focus')
  const closedIndex = events.findIndex((event) => event.type === 'closed')

  assert.ok(removalIndex >= 0, JSON.stringify(events.map((event) => ({
    type: event.type,
    listenerType: event.listenerType,
    target: event.target,
    value: event.value,
    tag: event.node?.tag,
    testId: event.node?.getAttribute?.('data-testid')
  }))))
  assert.ok(trapReleaseIndex > removalIndex)
  assert.ok(backgroundReleaseIndex > trapReleaseIndex)
  assert.ok(scrollReleaseIndex > backgroundReleaseIndex)
  assert.ok(focusIndex > scrollReleaseIndex)
  assert.ok(closedIndex > focusIndex)
  assert.equal(events.filter((event) => event.type === 'return-focus').length, 1)
  assert.equal(closedCount, 1)
})

test('agent report Drawer keeps agent-specific empty and loading-error feedback inside the open layer', async (t) => {
  const component = await loadDrawer()
  const harness = await createSfcHarness(component, { visible: true, user, report: null, error: '' })
  t.after(harness.cleanup)
  await harness.finishTransitions()

  const drawer = harness.findByTestId('user-agent-report-drawer')
  assert.match(drawer.textContent, /当前代理暂无业务报表数据/)
  assert.match(drawer.textContent, /该代理尚无可统计的客户与佣金记录/)
  assert.equal(harness.findByTestId('agent-report-pagination'), undefined)

  harness.props.error = '报表服务暂时不可用'
  await harness.flush()
  const alert = harness.allNodes().find((node) => node.getAttribute?.('role') === 'alert')
  assert.ok(alert)
  assert.match(alert.textContent, /代理报表加载失败/)
  assert.match(alert.textContent, /报表服务暂时不可用/)
  assert.equal(harness.findByTestId('agent-report-pagination'), undefined)
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
  assert.match(survivingDrawers[0].textContent, /新代理上下文提示/)
  assert.equal(harness.findByText('业绩明细', 'button').getAttribute('aria-selected'), 'true')
  harness.findByText('产品线汇总', 'button').click()
  await harness.flush()
  assert.match(survivingDrawers[0].textContent, /借贷产品/)
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

test('agent report Drawer uses the shared fixed layer, fixed report regions, and required motion safeguards', async () => {
  const source = await readFile(drawerFile, 'utf8')

  assert.match(source, /useDialogLifecycle/)
  assert.match(source, /:style="layerStyle"/)
  assert.match(source, /class="fixed inset-0/)
  assert.match(source, /data-testid="user-agent-report-body"[^>]*flex-col[^>]*overflow-hidden/)
  assert.match(source, /data-testid="agent-report-overview"/)
  assert.match(source, /data-testid="agent-report-tablist"/)
  assert.match(source, /role="tablist"/)
  assert.match(source, /role="tab"/)
  assert.match(source, /data-testid="agent-report-products-panel"/)
  assert.match(source, /data-testid="agent-report-daily-panel"/)
  assert.match(source, /role="tabpanel"/)
  assert.match(source, /data-testid="agent-report-product-table"/)
  assert.match(source, /data-testid="agent-report-daily-header"/)
  assert.match(source, /data-testid="agent-report-pagination"/)
  assert.match(source, /data-testid="agent-report-daily-panel"[\s\S]*class="mt-3 min-h-0 flex-1 overflow-y-auto/)
  assert.match(source, /data-testid="agent-report-products-panel"[\s\S]*class="mt-3 min-h-0 flex-1 overflow-y-auto/)
  assert.match(source, /activeTab === 'daily' && dailyRows\.length/)
  assert.equal((source.match(/overflow-y-auto/g) || []).length, 4)
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
