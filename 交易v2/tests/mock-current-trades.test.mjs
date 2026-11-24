import test from 'node:test'
import assert from 'node:assert/strict'
import {createCurrentTrades,finishCurrentTrade,positionPnl} from '../src/utils/mockCurrentTrades.js'
test('fixtures have distinct identities and both positive and negative unrealized outcomes',()=>{
 const rows=createCurrentTrades();assert.equal(new Set(rows.map(o=>o.id)).size,9)
 const pnl=rows.filter(o=>o.bucket==='positions').map(positionPnl);assert.ok(pnl.some(n=>n>0)&&pnl.some(n=>n<0))
})
test('close moves a position into history exactly once with net P&L',()=>{
 const rows=createCurrentTrades(),o=rows[0],id=o.id
 assert.equal(finishCurrentTrade(rows,id,123),true)
 const h=rows[0];assert.equal(h.bucket,'positionHistory');assert.equal(h.closedAt,123)
 assert.equal(h.pnl,Number((positionPnl(o)-h.fee).toFixed(2)))
 assert.equal(h.filledQuantity,o.quantity);assert.equal(finishCurrentTrade(rows,id),false);assert.equal(rows.length,9)
})
test('cancellation preserves original terms, creates unfilled history and leaves other records untouched',()=>{
 for(const bucket of ['openOrders','spotOpenOrders']){
 const rows=createCurrentTrades(),o=rows.find(o=>o.bucket===bucket),before=JSON.stringify(rows.filter(r=>r.id!==o.id))
 assert.equal(finishCurrentTrade(rows,o.id),true)
 const h=rows.find(r=>r.id==='closed-'+o.id);assert.equal(h.bucket,bucket==='openOrders'?'orderHistory':'spotOrdersHistory')
 assert.equal(h.filledQuantity,0);assert.equal(h.fee,0);assert.equal(h.recordStatus,'trade.cancelled');assert.equal(h.price,o.price)
 assert.equal(JSON.stringify(rows.filter(r=>r.id!==h.id)),before)
 }
})
