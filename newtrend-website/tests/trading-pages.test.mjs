import test from 'node:test'
import assert from 'node:assert/strict'
import { tradeProducts, selectProductRecords } from '../src/utils/tradeProducts.js'
import { createTradePageState, createOrderDrafts, useTradePageState, useOrderDrafts } from '../src/composables/tradePageState.js'

test('each product exposes only its own records, with current and settled delivery separated', () => {
  const rows = [
    {id:'position',kind:'futures',bucket:'positions'},
    {id:'delivery',kind:'options',bucket:'optionsOrders',settled:false},
    {id:'settled',kind:'options',bucket:'optionsOrders',settled:true},
    {id:'spot',kind:'spot',bucket:'spotOpenOrders'},
    {id:'cancelled',kind:'spot',bucket:'spotOrdersHistory',recordStatus:'trade.cancelled'},
  ]
  for (const mode of Object.keys(tradeProducts)) {
    for (const tab of tradeProducts[mode].tabs) assert.ok(selectProductRecords(rows,mode,tab.id).every(row=>row.kind===mode))
  }
  assert.deepEqual(selectProductRecords(rows,'options','current').map(x=>x.id),['delivery'])
  assert.deepEqual(selectProductRecords(rows,'options','history').map(x=>x.id),['settled'])
  assert.deepEqual(selectProductRecords(rows,'spot','history').map(x=>x.id),['cancelled'])
  assert.deepEqual(selectProductRecords(rows,'spot','invalid'),[])
})

test('product view state and order drafts are independent', () => {
  const futures=createTradePageState('futures'),spot=createTradePageState('spot')
  futures.query='BTC';futures.pages.positions=3;futures.interval='trade.interval_1d'
  assert.equal(spot.query,'');assert.equal(spot.pages.positions,undefined)
  assert.equal(spot.interval,'trade.interval_1h')
  const drafts=createOrderDrafts()
  drafts.futures.amount='250';drafts.spot.buy.amount='100';drafts.options.duration=60
  assert.equal(drafts.spot.sell.amount,'');assert.equal(drafts.options.amount,'')
  assert.equal(createOrderDrafts().futures.amount,'')
})

test('returning to a product restores its session state and draft without sharing view filters', () => {
  const futures=useTradePageState('futures')
  futures.query='ETH';futures.record='history';futures.pages.history=2
  useOrderDrafts().futures.amount='321'
  const spot=useTradePageState('spot')
  assert.equal(spot.query,'')
  assert.equal(useTradePageState('futures'),futures)
  assert.equal(useTradePageState('futures').pages.history,2)
  assert.equal(useOrderDrafts().futures.amount,'321')
  assert.equal(useOrderDrafts().spot.buy.amount,'')
})
