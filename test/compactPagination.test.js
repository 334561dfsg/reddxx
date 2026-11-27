import test from 'node:test'
import assert from 'node:assert/strict'
import { createSfcHarness, loadVueSfc } from './helpers/vueSfcHarness.js'

const componentFile = new URL('../src/admin/components/CompactPagination.vue', import.meta.url).pathname

const buttons = (harness) => harness.allNodes().filter((node) => node.tag === 'button')

test('shows a finite, centered page window and enabled neighboring navigation', async () => {
  const harness = await createSfcHarness(await loadVueSfc(componentFile), {
    currentPage: 5,
    totalCount: 95
  })

  assert.equal(harness.findByTestId('compact-pagination-summary').textContent.trim(), '共 95 条 · 第 5 / 10 页')
  assert.deepEqual(
    buttons(harness).map((button) => button.textContent.trim()),
    ['上一页', '3', '4', '5', '6', '7', '下一页']
  )
  assert.equal(harness.findByText('上一页', 'button').disabled, false)
  assert.equal(harness.findByText('下一页', 'button').disabled, false)
  assert.equal(harness.findByText('5', 'button').getAttribute('aria-current'), 'page')

  harness.cleanup()
})

test('keeps the count visible but hides navigation for one page of results', async () => {
  const harness = await createSfcHarness(await loadVueSfc(componentFile), {
    currentPage: 1,
    totalCount: 8
  })

  assert.equal(harness.findByTestId('compact-pagination-summary').textContent.trim(), '共 8 条 · 第 1 / 1 页')
  assert.deepEqual(buttons(harness), [])

  harness.cleanup()
})

test('always shows disabled navigation for an opted-in empty result set', async () => {
  const harness = await createSfcHarness(await loadVueSfc(componentFile), {
    currentPage: 1,
    totalCount: 0,
    pageSize: 5,
    alwaysShowNavigation: true
  })

  assert.equal(harness.findByTestId('compact-pagination-summary').textContent.trim(), '共 0 条 · 第 1 / 1 页')
  assert.deepEqual(
    buttons(harness).map((button) => button.textContent.trim()),
    ['上一页', '1', '下一页']
  )
  assert.equal(harness.findByText('上一页', 'button').disabled, true)
  assert.equal(harness.findByText('下一页', 'button').disabled, true)
  assert.equal(harness.findByText('1', 'button').getAttribute('aria-current'), 'page')

  harness.cleanup()
})

test('clamps requested page changes before emitting them', async () => {
  const harness = await createSfcHarness(await loadVueSfc(componentFile), {
    currentPage: 99,
    totalCount: 95
  }, { 'onUpdate:currentPage': () => {} })

  harness.findByText('上一页', 'button').click()

  assert.deepEqual(harness.emitted, [['onUpdate:currentPage', 9]])

  harness.cleanup()
})

test('normalizes fractional and lower-bound requests and keeps narrow navigation reflowable', async () => {
  const harness = await createSfcHarness(await loadVueSfc(componentFile), {
    currentPage: 3,
    totalCount: 95
  }, { 'onUpdate:currentPage': () => {} })

  const navigation = harness.allNodes().find((node) => node.tag === 'nav' && node.getAttribute('aria-label') === '分页导航')
  assert.ok(navigation.classList.contains('flex-wrap'))
  assert.ok(navigation.classList.contains('w-full'))
  assert.ok(buttons(harness).every((button) => button.classList.contains('min-h-10')))

  harness.props.currentPage = 2.8
  await harness.flush()
  harness.findByText('上一页', 'button').click()
  harness.props.currentPage = -4
  await harness.flush()
  harness.findByText('下一页', 'button').click()
  assert.deepEqual(harness.emitted, [
    ['onUpdate:currentPage', 1],
    ['onUpdate:currentPage', 2]
  ])

  harness.cleanup()
})
