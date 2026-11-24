import test from 'node:test'
import assert from 'node:assert/strict'
import {mockTradeHistory,historyBuckets,historyFields} from '../src/utils/mockTradeHistory.js'
test('each historical category has three pages of independent fixtures',()=>{assert.equal(new Set(mockTradeHistory.map(o=>o.id)).size,mockTradeHistory.length);for(const bucket of historyBuckets){const rows=mockTradeHistory.filter(o=>o.bucket===bucket);assert.equal(rows.length,12);assert.ok(rows.every(o=>o.closedAt>=o.createdAt));assert.ok(rows.every(o=>historyFields(o).length>=4))}})
test('option wins and losses match direction and opening/closing prices',()=>{for(const o of mockTradeHistory.filter(o=>o.kind==='options')){const movement=(o.closePrice-o.price)*(o.direction==='buy'?1:-1);assert.equal(Math.sign(movement),Math.sign(o.pnl))}})
test('cancelled orders have no fills or fees',()=>{const rows=mockTradeHistory.filter(o=>o.recordStatus==='trade.cancelled');assert.ok(rows.length);assert.ok(rows.every(o=>o.filledQuantity===0&&o.fee===0))})
