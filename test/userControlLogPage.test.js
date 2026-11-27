import assert from 'node:assert/strict'
import { resolve } from 'node:path'
import test from 'node:test'
import { createMemoryHistory, createRouter } from 'vue-router'
import { createUserControlState } from '../src/features/user-control/userControl.js'
import { userControlState } from '../src/admin/state/userControlState.js'
import { createSfcHarness, loadVueSfc } from './helpers/vueSfcHarness.js'

const pageFile = resolve(process.cwd(), 'src/pages/admin/user-control/UserControlLogPage.vue')
const earnDir = resolve(process.cwd(), 'src/pages/admin/earn')

// Stand-ins for the shared Pro list parts: the page shell renders its slot, the query card and table card expose
// their props/events so the test drives the applied filters and reads the rows the page hands to the table.
const vueUrl = import.meta.resolve('vue')
const moduleUrl = (code) => `data:text/javascript;base64,${Buffer.from(code).toString('base64')}`
const standIns = {
  [resolve(earnDir, 'EarnPageShell.vue')]: moduleUrl(`import { h } from '${vueUrl}'; export default { name: 'PageShellStandIn', inheritAttrs: false, setup(_, { slots, attrs }) { return () => h('section', attrs, slots.default?.()) } }`),
  [resolve(earnDir, 'EarnSearchForm.vue')]: moduleUrl(`export default { name: 'SearchFormStandIn', props: ['model', 'fields', 'name'], emits: ['search', 'reset'], render() { return null } }`),
  [resolve(earnDir, 'EarnAdminTable.vue')]: moduleUrl(`import { h } from '${vueUrl}'; export default { name: 'AdminTableStandIn', props: ['title', 'rows', 'columns', 'page', 'rowKey', 'desktopOnly'], emits: ['update:page'], setup(props, { slots }) { return () => h('table', props.rows.slice((props.page - 1) * 10, props.page * 10).map(record => h('tr', props.columns.map(column => h('td', slots.cell?.({ column, record })))))) } }`)
}

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

const mountPage = async () => {
  const previousState = userControlState.value
  const decoy = (id, overrides) => ({ ...makeLogs('user_2002', 'delivery', id)[0], id, batchId: id, ...overrides })
  userControlState.value = {
    ...createUserControlState(),
    operationLogs: [
      ...makeLogs('user_1001', 'delivery', 'alpha'),
      ...makeLogs('user_2002', 'delivery', 'beta'),
      decoy('decoy-source', { scope: 'module', note: 'must stay hidden by source filter', createdAt: '2026-07-31 12:00:00' }),
      decoy('decoy-action', { action: 'cancel', note: 'must stay hidden by action filter', createdAt: '2026-07-30 12:00:00' }),
      decoy('decoy-date', { note: 'must stay hidden by date filter', createdAt: '2026-08-01 12:00:00' }),
      decoy('decoy-module', { modules: ['spot'], note: 'must stay hidden by module filter', createdAt: '2026-07-29 12:00:00' })
    ]
  }

  const page = await loadVueSfc(pageFile, { vueImports: standIns })
  const router = createRouter({
    history: createMemoryHistory(),
    routes: [{ path: '/admin/users/control-log', name: 'users-control-log', component: page }]
  })
  await router.push({ name: 'users-control-log', query: { userId: 'user_1001', module: 'delivery' } })
  await router.isReady()

  const harness = await createSfcHarness(page, {}, {}, { plugins: [router] })
  const cleanup = () => {
    harness.cleanup()
    userControlState.value = previousState
  }
  return { ...harness, cleanup, router }
}

const notes = (table) => table.props.rows.map(row => row.note).join('\n')

test('route query seeds UID/module; later route changes update only those and keep the other applied filters', async (t) => {
  const harness = await mountPage()
  t.after(harness.cleanup)

  const form = harness.findComponent('SearchFormStandIn')
  const table = harness.findComponent('AdminTableStandIn')
  assert.ok(form && table, 'query card and table card must be rendered')
  assert.equal(form.props.model.userId, 'user_1001')
  assert.equal(form.props.model.module, 'delivery')
  assert.deepEqual(form.props.fields.map(field => field.label), ['UID', '模块', '规则来源', '操作类型', '操作日期'])
  assert.equal(table.props.rows.length, 12)
  assert.match(notes(table), /alpha route filter row/)

  form.emit('search', { ...form.props.model, source: 'global', action: 'apply', date: ['2026-07-01', '2026-07-31'] })
  await harness.flush()
  table.emit('update:page', 2)
  await harness.flush()
  assert.equal(table.props.page, 2)

  await harness.router.replace({ name: 'users-control-log', query: { userId: 'user_2002', module: 'delivery' } })
  await harness.flush()

  assert.equal(form.props.model.userId, 'user_2002')
  assert.equal(form.props.model.module, 'delivery')
  assert.equal(form.props.model.source, 'global')
  assert.equal(form.props.model.action, 'apply')
  assert.deepEqual(form.props.model.date, ['2026-07-01', '2026-07-31'])
  assert.equal(table.props.page, 1)
  const content = notes(table)
  assert.equal(table.props.rows.length, 12)
  assert.match(content, /beta route filter row/)
  assert.doesNotMatch(content, /alpha route filter row/)
  assert.doesNotMatch(content, /must stay hidden/)
  assert.ok(harness.findByTestId('user-control-unified-operator-value'))
  assert.ok(harness.findByTestId('user-control-unified-reference-value'))
  assert.ok(harness.findByTestId('user-control-unified-duration-value'))
})

test('reset clears the applied filters and the route query', async (t) => {
  const harness = await mountPage()
  t.after(harness.cleanup)

  harness.findComponent('SearchFormStandIn').emit('reset')
  await new Promise(resolvePromise => setTimeout(resolvePromise, 10))
  await harness.flush()

  assert.deepEqual(harness.router.currentRoute.value.query, {})
  assert.equal(harness.findComponent('SearchFormStandIn').props.model.userId, '')
  assert.equal(harness.findComponent('AdminTableStandIn').props.rows.length, 28)
})
