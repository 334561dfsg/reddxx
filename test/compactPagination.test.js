import test from 'node:test'
import assert from 'node:assert/strict'
import { createSfcHarness, loadVueSfc } from './helpers/vueSfcHarness.js'

const componentFile = new URL('../src/admin/components/CompactPagination.vue', import.meta.url).pathname
const byClass = (harness, className) => harness.allNodes().find(node => node.classList?.contains(className))
const pages = harness => harness.allNodes().filter(node => node.classList?.contains('ant-pagination-item'))
const previous = harness => byClass(harness, 'ant-pagination-prev')
const next = harness => byClass(harness, 'ant-pagination-next')

test('renders bounded Ant pagination with neighboring pages and the selected page', async t => {
  const harness = await createSfcHarness(await loadVueSfc(componentFile), { currentPage: 5, totalCount: 95 })
  t.after(harness.cleanup)
  assert.equal(harness.findByTestId('compact-pagination-summary').textContent.trim(), '共 95 条 · 第 5 / 10 页')
  assert.deepEqual(pages(harness).map(node => Number(node.getAttribute('title'))), [1, 4, 5, 6, 10])
  assert.equal(byClass(harness, 'ant-pagination-item-active').getAttribute('title'), '5')
  assert.equal(previous(harness).getAttribute('aria-disabled'), 'false')
  assert.equal(next(harness).getAttribute('aria-disabled'), 'false')
})

test('keeps the count visible but hides navigation for one page of results', async t => {
  const harness = await createSfcHarness(await loadVueSfc(componentFile), { currentPage: 1, totalCount: 8 })
  t.after(harness.cleanup)
  assert.equal(harness.findByTestId('compact-pagination-summary').textContent.trim(), '共 8 条 · 第 1 / 1 页')
  assert.equal(byClass(harness, 'ant-pagination'), undefined)
})

test('always shows disabled navigation for an opted-in empty result set', async t => {
  const harness = await createSfcHarness(await loadVueSfc(componentFile), { currentPage: 1, totalCount: 0, pageSize: 5, alwaysShowNavigation: true }, { 'onUpdate:currentPage': () => {} })
  t.after(harness.cleanup)
  assert.equal(harness.findByTestId('compact-pagination-summary').textContent.trim(), '共 0 条 · 第 1 / 1 页')
  assert.equal(previous(harness).getAttribute('aria-disabled'), 'true')
  assert.equal(next(harness).getAttribute('aria-disabled'), 'true')
  previous(harness).click()
  next(harness).click()
  assert.deepEqual(harness.emitted, [])
})

test('clamps an out-of-range current page before emitting navigation', async t => {
  const harness = await createSfcHarness(await loadVueSfc(componentFile), { currentPage: 99, totalCount: 95 }, { 'onUpdate:currentPage': () => {} })
  t.after(harness.cleanup)
  previous(harness).click()
  assert.deepEqual(harness.emitted, [['onUpdate:currentPage', 9]])
})

test('normalizes fractional and lower-bound requests and keeps navigation reflowable', async t => {
  const harness = await createSfcHarness(await loadVueSfc(componentFile), { currentPage: 3, totalCount: 95 }, { 'onUpdate:currentPage': () => {} })
  t.after(harness.cleanup)
  const navigation = harness.allNodes().find(node => node.tag === 'nav' && node.getAttribute('aria-label') === '分页导航')
  assert.ok(navigation.classList.contains('flex-wrap'))
  assert.ok(byClass(harness, 'ant-pagination').classList.contains('flex-wrap'))
  harness.props.currentPage = 2.8
  await harness.flush()
  previous(harness).click()
  harness.props.currentPage = -4
  await harness.flush()
  next(harness).click()
  assert.deepEqual(harness.emitted, [['onUpdate:currentPage', 1], ['onUpdate:currentPage', 2]])
})
