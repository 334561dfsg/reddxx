import test from 'node:test'
import assert from 'node:assert/strict'
import {session} from '../src/session.js'
import {availableInMode, demoHiddenPath} from '../src/utils/demoAccess.js'

test('the demo account hides C2C and lending, the real account keeps them', () => {
  for (const path of ['/c2c/buy', '/c2c/orders', '/earn/loan', '/earn/loan/my', '/earn/loan/order/LOAN-1']) assert.ok(demoHiddenPath(path), path)
  for (const path of ['/earn', '/earn/simple', '/earn/my-earnings', '/ai-quant', '/c2cx']) assert.ok(!demoHiddenPath(path), path)
  const mode = session.mode
  try {
    session.mode = 'common.demo.demo'
    assert.equal(availableInMode('/c2c/buy'), false)
    assert.equal(availableInMode('/earn/simple'), true)
    session.mode = 'common.demo.real'
    assert.equal(availableInMode('/c2c/buy'), true)
    assert.equal(availableInMode('/earn/loan'), true)
  } finally { session.mode = mode }
})
