import test from 'node:test'
import assert from 'node:assert/strict'
import {createCurrentTrades,finishCurrentTrade,positionPnl} from '../src/utils/mockCurrentTrades.js'
test('fixtures have distinct identities and both positive and negative unrealized outcomes',()=>{
 const rows=createCurrentTrades();assert.equal(new Set(rows.map(o=>o.id)).size,21)
 const pnl=rows.filter(o=>o.bucket==='positions').map(positionPnl);assert.ok(pnl.some(n=>n>0)&&pnl.some(n=>n<0))
})
test('close moves a position into history exactly once with net P&L',()=>{
 const rows=createCurrentTrades(),o=rows[0],id=o.id
 assert.equal(finishCurrentTrade(rows,id,123),true)
 const h=rows[0];assert.equal(h.bucket,'positionHistory');assert.equal(h.closedAt,123)
 assert.equal(h.pnl,Number((positionPnl(o)-h.fee).toFixed(2)))
 assert.equal(h.filledQuantity,o.quantity);assert.equal(finishCurrentTrade(rows,id),false);assert.equal(rows.length,21)
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

test('partial cancellations retain fills and charge only executed quantity',()=>{
 for(const bucket of ['openOrders','spotOpenOrders']){
  const rows=createCurrentTrades(),o=rows.find(o=>o.bucket===bucket&&o.filledQuantity>0)
  assert.ok(o.filledQuantity<o.quantity)
  finishCurrentTrade(rows,o.id)
  const h=rows.find(r=>r.id==='closed-'+o.id)
  assert.equal(h.filledQuantity,o.filledQuantity)
  assert.equal(h.fee,Number((o.price*o.filledQuantity*.0005).toFixed(2)))
 }
})
test('current delivery fixtures have no fabricated settlement results',()=>{
 const now=Date.now(),rows=createCurrentTrades(now).filter(o=>o.kind==='options')
 assert.equal(rows.length,3)
 for(const o of rows){assert.equal(o.settled,false);assert.ok(o.openedAt<=now);assert.ok(o.openedAt+o.duration*1000>now);assert.equal(o.pnl,undefined);assert.equal(o.closePrice,undefined)}
})

test('all product record tabs have independent samples',async()=>{
 const {mockTradeHistory,historyFields}=await import('../src/utils/mockTradeHistory.js')
 const {tradeProducts,selectProductRecords}=await import('../src/utils/tradeProducts.js')
 const rows=[...createCurrentTrades(),...mockTradeHistory]
 for(const [mode,product] of Object.entries(tradeProducts))for(const tab of product.tabs){
  const records=selectProductRecords(rows,mode,tab.id)
  assert.ok(records.length>=3,`${mode}/${tab.id}`)
  assert.ok(records.every(o=>o.kind===mode))
 }
 for(const o of rows.filter(o=>o.kind==='options'&&!o.settled)){
  assert.ok(historyFields(o).every(f=>!['trade.closeTime','trade.closePrice','trade.history.pnl'].includes(f.label)))
 }
 assert.ok(mockTradeHistory.some(o=>o.kind==='spot'&&o.recordStatus==='trade.cancelled'))
})
