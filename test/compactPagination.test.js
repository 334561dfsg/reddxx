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

test('clamps requested page changes before emitting them', async () => {
  const harness = await createSfcHarness(await loadVueSfc(componentFile), {
    currentPage: 99,
    totalCount: 95
  }, { 'onUpdate:currentPage': () => {} })

  harness.findByText('上一页', 'button').click()

  assert.deepEqual(harness.emitted, [['onUpdate:currentPage', 9]])

  harness.cleanup()
})
