import assert from 'node:assert/strict'
import { resolve } from 'node:path'
import test from 'node:test'
import { createMemoryHistory, createRouter } from 'vue-router'
import { createUserControlState } from '../src/features/user-control/userControl.js'
import { userControlState } from '../src/admin/state/userControlState.js'
import { createSfcHarness, loadVueSfc, loadVueSfcModuleUrl } from './helpers/vueSfcHarness.js'

const pageFile = resolve(process.cwd(), 'src/pages/admin/user-control/UserControlLogPage.vue')
const contentFile = resolve(process.cwd(), 'src/admin/components/user-control/UserControlLogContent.vue')
const paginationFile = resolve(process.cwd(), 'src/admin/components/AdminListPaginationBar.vue')

const makeLogs = (userId, moduleKey, prefix) => Array.from({ length: 12 }, (_, index) => ({
  id: `${prefix}-${index + 1}`,
  userId,
  scope: 'global',
  action: 'apply',
  modules: [moduleKey],
  strategy: 'positive',
  duration: 'permanent',
  operator: 'admin_route_test',
  batchId: `${prefix}-batch-${index + 1}`,
  status: 'success',
  note: `${prefix} route filter row`,
  createdAt: `2026-07-${String(index + 1).padStart(2, '0')} 10:00:00`
}))

const setControlValue = async (harness, node, value, eventType = 'change') => {
  node.value = value
  if (node.tag === 'select') {
    for (const option of node.options) option.selected = String(option.value) === String(value)
  }
  node.dispatchEvent({
    type: eventType,
    target: node,
    currentTarget: node,
    defaultPrevented: false,
    preventDefault() { this.defaultPrevented = true }
  })
  await harness.flush()
}

const fieldControl = (harness, label) => {
  const labelText = harness.findByText(label, 'span')
  assert.ok(labelText, `${label} label must be rendered`)
  return labelText.parent.children.find((node) => ['input', 'select'].includes(node.tag))
}

const mountPage = async () => {
  const previousState = userControlState.value
  userControlState.value = {
    ...createUserControlState(),
    operationLogs: [
      ...makeLogs('user_1001', 'perpetual', 'alpha'),
      ...makeLogs('user_2002', 'spot', 'beta'),
      {
        ...makeLogs('user_2002', 'spot', 'decoy-source')[0],
        id: 'decoy-source',
        batchId: 'decoy-source',
        scope: 'module',
        note: 'must stay hidden by source filter',
        createdAt: '2026-07-31 12:00:00'
      },
      {
        ...makeLogs('user_2002', 'spot', 'decoy-action')[0],
        id: 'decoy-action',
        batchId: 'decoy-action',
        action: 'cancel',
        note: 'must stay hidden by action filter',
        createdAt: '2026-07-30 12:00:00'
      },
      {
        ...makeLogs('user_2002', 'spot', 'decoy-date')[0],
        id: 'decoy-date',
        batchId: 'decoy-date',
        note: 'must stay hidden by date filter',
        createdAt: '2026-08-01 12:00:00'
      }
    ]
  }

  const page = await loadVueSfc(pageFile, {
    vueImports: {
      [contentFile]: loadVueSfcModuleUrl(contentFile, {
        vueImports: {
          [paginationFile]: loadVueSfcModuleUrl(paginationFile)
        }
      })
    }
  })
  const router = createRouter({
    history: createMemoryHistory(),
    routes: [{ path: '/admin/users/control-log', name: 'users-control-log', component: page }]
  })
  await router.push({
    name: 'users-control-log',
    query: { userId: 'user_1001', module: 'perpetual' }
  })
  await router.isReady()

  const harness = await createSfcHarness(page, {}, {}, { plugins: [router] })
  const cleanup = () => {
    harness.cleanup()
    userControlState.value = previousState
  }
  return { ...harness, cleanup, router }
}

test('route query changes update only UID/module while preserving local filters and page size', async (t) => {
  const harness = await mountPage()
  t.after(harness.cleanup)

  const source = fieldControl(harness, '规则来源')
  const action = fieldControl(harness, '操作类型')
  const dateFrom = fieldControl(harness, '开始日期')
  const dateTo = fieldControl(harness, '结束日期')
  const pageSize = fieldControl(harness, '每页')

  await setControlValue(harness, source, 'global')
  await setControlValue(harness, action, 'apply')
  await setControlValue(harness, dateFrom, '2026-07-01', 'input')
  await setControlValue(harness, dateTo, '2026-07-31', 'input')
  await setControlValue(harness, pageSize, 5)
  harness.findByText('下一页', 'button').click()
  await harness.flush()
  assert.ok(harness.findByText('第 2 / 3 页', 'span'))

  await harness.router.replace({
    name: 'users-control-log',
    query: { userId: 'user_2002', module: 'spot' }
  })
  await harness.flush()

  assert.equal(fieldControl(harness, 'UID').value, 'user_2002')
  assert.equal(fieldControl(harness, '开始日期').value, '2026-07-01')
  assert.equal(fieldControl(harness, '结束日期').value, '2026-07-31')
  const content = harness.findByTestId('user-control-log-content').textContent
  assert.match(content, /beta route filter row/)
  assert.doesNotMatch(content, /alpha route filter row/)
  assert.doesNotMatch(content, /must stay hidden by source filter/)
  assert.doesNotMatch(content, /must stay hidden by action filter/)
  assert.doesNotMatch(content, /must stay hidden by date filter/)
  assert.ok(harness.findByText('第 1 / 3 页', 'span'))
})
