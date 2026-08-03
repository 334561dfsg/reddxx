import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import { resolve } from 'node:path'
import test from 'node:test'
import { createSfcHarness, loadVueSfc, loadVueSfcModuleUrl } from './helpers/vueSfcHarness.js'

const projectFile = (path) => resolve(process.cwd(), path)
const drawerFile = projectFile('src/admin/components/user/UserAgentSubordinateDrawer.vue')
const paginationFile = projectFile('src/admin/components/CompactPagination.vue')
const user = { id: 'agent_1', username: 'agent_alpha', role: 'agent' }
const statuses = ['active', 'suspended', 'banned']
const rows = Array.from({ length: 21 }, (_, index) => ({
  id: `sub-${index + 1}`,
  uid: String(8100001 + index),
  username: index === 0 ? 'client_alpha' : `client_${index + 1}`,
  registeredAt: `2026-01-${String((index % 28) + 1).padStart(2, '0')}`,
  status: statuses[index % statuses.length],
  totalVolume: 100000 + index,
  commissionContribution: 1200 + index
}))

const loadDrawer = async () => loadVueSfc(drawerFile, {
  vueImports: { [paginationFile]: loadVueSfcModuleUrl(paginationFile) }
})

const rowNodes = (harness) => harness.allNodes()
  .filter((node) => node.getAttribute?.('data-testid') === 'agent-subordinate-row')

const inputValue = async (harness, label, value, type = 'input') => {
  const control = harness.allNodes().find((node) => node.getAttribute?.('aria-label') === label)
  assert.ok(control)
  control.value = value
  if (control.tag === 'select') {
    control.options.forEach((option) => {
      option.selected = option.value === value || option.getAttribute?.('value') === value
    })
  }
  control.dispatchEvent({ type, target: control })
  await harness.flush()
}

test('agent subordinate Drawer renders customer details and ten rows per page', async (t) => {
  const component = await loadDrawer()
  const harness = await createSfcHarness(component, { visible: true, user, rows, error: '', loading: false })
  t.after(harness.cleanup)
  await harness.finishTransitions()

  const drawer = harness.findByTestId('user-agent-subordinate-drawer')
  assert.equal(drawer.getAttribute('role'), 'dialog')
  assert.equal(drawer.getAttribute('aria-modal'), 'true')
  assert.match(drawer.textContent, /代理下级用户/)
  assert.match(drawer.textContent, /agent_alpha/)
  assert.equal(rowNodes(harness).length, 10)
  assert.match(rowNodes(harness)[0].textContent, /8100001/)
  assert.match(rowNodes(harness)[0].textContent, /client_alpha/)
  assert.match(rowNodes(harness)[0].textContent, /2026-01-01/)
  assert.doesNotMatch(rowNodes(harness)[0].textContent, /活跃|暂停|禁用/)
  assert.match(rowNodes(harness)[0].textContent, /累计业务量/)
  assert.match(rowNodes(harness)[0].textContent, /佣金贡献/)
  assert.equal(harness.findByTestId('compact-pagination-summary').textContent.trim(), '共 21 条 · 第 1 / 3 页')
  const body = harness.findByTestId('user-agent-subordinate-body')
  const controls = harness.findByTestId('agent-subordinate-controls')
  const scrollRegion = harness.findByTestId('agent-subordinate-list-scroll')
  const pagination = harness.findByTestId('agent-subordinate-pagination')
  assert.match(body.getAttribute('class'), /overflow-hidden/)
  assert.match(controls.getAttribute('class'), /shrink-0/)
  assert.equal(scrollRegion.getAttribute('role'), 'region')
  assert.equal(scrollRegion.getAttribute('aria-label'), '代理直属客户列表')
  assert.equal(scrollRegion.getAttribute('tabindex'), '0')
  assert.match(scrollRegion.getAttribute('class'), /overflow-y-auto/)
  assert.match(pagination.getAttribute('class'), /shrink-0/)
  assert.equal(scrollRegion.contains(pagination), false)

  harness.findByText('下一页', 'button').click()
  await harness.flush()
  assert.match(rowNodes(harness)[0].textContent, /8100011/)
})

test('agent subordinate Drawer searches, filters, resets, and clamps pagination', async (t) => {
  const component = await loadDrawer()
  const harness = await createSfcHarness(component, { visible: true, user, rows, error: '', loading: false })
  t.after(harness.cleanup)
  await harness.finishTransitions()

  harness.findByText('下一页', 'button').click()
  await harness.flush()
  await inputValue(harness, '搜索下级用户', 'CLIENT_ALPHA')
  assert.equal(rowNodes(harness).length, 1)
  assert.match(rowNodes(harness)[0].textContent, /client_alpha/)
  assert.equal(harness.findByTestId('compact-pagination-summary').textContent.trim(), '共 1 条 · 第 1 / 1 页')

  await inputValue(harness, '搜索下级用户', '')
  await inputValue(harness, '用户状态', 'suspended', 'change')
  const suspendedRows = rows.filter((row) => row.status === 'suspended')
  assert.equal(rowNodes(harness).length, suspendedRows.length)
  assert.deepEqual(rowNodes(harness).map((node) => node.textContent.match(/UID (\d+)/)?.[1]), suspendedRows.map((row) => row.uid))
  assert.ok(rowNodes(harness).every((node) => !/活跃|暂停|禁用/.test(node.textContent)))

  await inputValue(harness, '用户状态', 'all', 'change')
  harness.findByText('下一页', 'button').click()
  harness.findByText('下一页', 'button').click()
  await harness.flush()
  harness.props.rows = rows.slice(0, 15)
  await harness.flush()
  assert.equal(harness.findByTestId('compact-pagination-summary').textContent.trim(), '共 15 条 · 第 2 / 2 页')

  harness.props.user = { id: 'agent_2', username: 'agent_beta', role: 'agent' }
  await harness.flush()
  assert.equal(harness.findByTestId('compact-pagination-summary').textContent.trim(), '共 15 条 · 第 1 / 2 页')
})

test('agent subordinate Drawer distinguishes empty data, filtered results, and retryable errors', async (t) => {
  const component = await loadDrawer()
  const emitted = []
  const harness = await createSfcHarness(component, { visible: true, user, rows: [], error: '', loading: false }, {
    onRetry: () => emitted.push('retry')
  })
  t.after(harness.cleanup)
  await harness.finishTransitions()

  assert.match(harness.findByTestId('user-agent-subordinate-drawer').textContent, /该代理暂无下级用户/)
  harness.props.rows = rows
  await harness.flush()
  await inputValue(harness, '搜索下级用户', 'not-found')
  assert.match(harness.findByTestId('user-agent-subordinate-drawer').textContent, /没有符合当前条件的下级用户/)

  harness.props.error = '请求失败'
  await harness.flush()
  const error = harness.findByTestId('agent-subordinate-error')
  assert.equal(error.getAttribute('role'), 'alert')
  assert.match(error.textContent, /请求失败/)
  assert.equal(harness.document.activeElement, error)
  harness.findByTestId('agent-subordinate-retry').click()
  assert.deepEqual(emitted, ['retry'])
  assert.ok(harness.findByTestId('user-agent-subordinate-drawer').isConnected)
})

test('agent subordinate Drawer resists backdrop and restores focus after intentional close', async (t) => {
  const component = await loadDrawer()
  const trigger = { isConnected: true, focusCount: 0, focus() { this.focusCount += 1 } }
  let closeCount = 0
  let harness
  harness = await createSfcHarness(component, { visible: true, user, rows, error: '', loading: false, returnFocus: trigger }, {
    onClose: () => { closeCount += 1; harness.props.visible = false }
  })
  t.after(harness.cleanup)
  await harness.finishTransitions()

  const drawer = harness.findByTestId('user-agent-subordinate-drawer')
  drawer.parent.click()
  await harness.flush()
  assert.equal(closeCount, 0)

  harness.allNodes().find((node) => drawer.contains(node) && node.getAttribute?.('aria-label') === '关闭').click()
  await harness.flush()
  assert.equal(closeCount, 1)
  assert.equal(drawer.isConnected, true)
  await harness.finishTransitions()
  assert.equal(trigger.focusCount, 1)
})

test('agent subordinate Drawer source keeps the fixed-frame modal and motion contract', async () => {
  const source = await readFile(drawerFile, 'utf8')

  assert.match(source, /useDialogLifecycle/)
  assert.match(source, /:style="layerStyle"/)
  assert.match(source, /class="fixed inset-0/)
  assert.match(source, /data-testid="user-agent-subordinate-body"[^>]*overflow-hidden/)
  assert.match(source, /data-testid="agent-subordinate-controls"[^>]*shrink-0/)
  assert.match(source, /data-testid="agent-subordinate-list-scroll"[^>]*overflow-y-auto/)
  assert.match(source, /data-testid="agent-subordinate-list-scroll"[^>]*role="region"/)
  assert.match(source, /data-testid="agent-subordinate-list-scroll"[^>]*tabindex="0"/)
  assert.match(source, /data-testid="agent-subordinate-pagination"[^>]*shrink-0/)
  assert.doesNotMatch(source, /<CompactPagination[\s\S]*?data-testid="agent-subordinate-list-scroll"/)
  assert.equal((source.match(/overflow-y-auto/g) || []).length, 1)
  assert.match(source, /overflow-hidden/)
  assert.match(source, /aria-label="关闭"/)
  assert.match(source, /200ms ease-out/)
  assert.match(source, /150ms ease-in/)
  assert.match(source, /prefers-reduced-motion: reduce/)
  assert.match(source, /transition-duration: 50ms/)
  assert.match(source, /transform: none/)
  assert.doesNotMatch(source, /STATUS_LABELS\[row\.status\]/)
  assert.match(source, /100vh/)
  assert.match(source, /100dvh/)
  assert.match(source, /safe-area-inset-top/)
  assert.match(source, /safe-area-inset-right/)
  assert.match(source, /safe-area-inset-bottom/)
  assert.match(source, /safe-area-inset-left/)
  assert.doesNotMatch(source, /@click\.self|@mousedown\.self|@touchend\.self/)
})
