import assert from 'node:assert/strict'
import { resolve } from 'node:path'
import test from 'node:test'
import { createUserControlState } from '../src/features/user-control/userControl.js'
import { userControlState } from '../src/admin/state/userControlState.js'
import { createSfcHarness, loadVueSfc } from './helpers/vueSfcHarness.js'

const contentFile = resolve(process.cwd(), 'src/admin/components/user-control/UserControlLogContent.vue')

const seededLogs = () => ({
  operationLogs: [
    {
      id: 'batch-user-1001',
      userId: 'user_1001',
      scope: 'global',
      action: 'apply',
      modules: ['perpetual'],
      strategy: 'positive',
      duration: 'permanent',
      operator: 'admin_1001',
      batchId: 'batch-user-1001',
      status: 'success',
      note: 'user 1001 batch',
      createdAt: '2026-07-26 10:00:00'
    },
    {
      id: 'batch-user-2002',
      userId: 'user_2002',
      scope: 'global',
      action: 'apply',
      modules: ['perpetual'],
      strategy: 'positive',
      duration: 'permanent',
      operator: 'admin_2002',
      batchId: 'batch-user-2002',
      status: 'success',
      note: 'user 2002 batch',
      createdAt: '2026-07-26 09:00:00'
    }
  ],
  executionLogs: [
    {
      id: 'order-user-1001',
      userId: 'user_1001',
      moduleKey: 'perpetual',
      source: 'global',
      duration: 'permanent',
      businessId: 'order-user-1001',
      beforeValue: 'loss',
      afterValue: 'profit',
      status: 'success',
      createdAt: '2026-07-26 10:01:00'
    },
    {
      id: 'order-user-2002',
      userId: 'user_2002',
      moduleKey: 'perpetual',
      source: 'global',
      duration: 'permanent',
      businessId: 'order-user-2002',
      beforeValue: 'loss',
      afterValue: 'profit',
      status: 'success',
      createdAt: '2026-07-26 09:01:00'
    }
  ]
})

const mountContent = async (props) => {
  const previousState = userControlState.value
  userControlState.value = { ...createUserControlState(), ...seededLogs() }
  const harness = await createSfcHarness(await loadVueSfc(contentFile), props)
  const cleanup = () => {
    harness.cleanup()
    userControlState.value = previousState
  }
  return { ...harness, cleanup }
}

test('fixed-user log content combines only that user operation and execution rows', async (t) => {
  const harness = await mountContent({ fixedUserId: 'user_1001', showUserFilter: false })
  t.after(harness.cleanup)
  assert.match(harness.findByTestId('user-control-log-content').textContent, /batch-user-1001/)
  assert.match(harness.findByTestId('user-control-log-content').textContent, /order-user-1001/)
  assert.doesNotMatch(harness.findByTestId('user-control-log-content').textContent, /batch-user-2002/)
  assert.equal(harness.findByTestId('user-control-log-user-filter') ?? null, null)
})

test('clearing drawer filters retains the fixed user context', async (t) => {
  const harness = await mountContent({ fixedUserId: 'user_1001', initialModule: 'perpetual', showUserFilter: false })
  t.after(harness.cleanup)
  harness.findByText('清除筛选', 'button').click()
  await harness.flush()
  assert.match(harness.findByTestId('user-control-log-content').textContent, /batch-user-1001/)
  assert.doesNotMatch(harness.findByTestId('user-control-log-content').textContent, /batch-user-2002/)
})
