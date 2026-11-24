import test from 'node:test'
import assert from 'node:assert/strict'
import {recordTabs,freshRecordFilter,filterRecords} from '../src/utils/recordFilters.js'
const orders=Object.values(recordTabs).map((c,i)=>({kind:c.kind,bucket:c.bucket,marketName:i%2?'ETH/USD':'BTC/USD',direction:i%2?'sell':'buy',createdAt:new Date(2026,10,24,12).getTime(),settled:false}))
test('each tab restricts results to its product and record category',()=>{
 for(const [key,config] of Object.entries(recordTabs))assert.deepEqual(filterRecords(orders,key,freshRecordFilter()),orders.filter(o=>o.kind===config.kind&&o.bucket===config.bucket))
})
test('symbol and direction combine without partial symbol matching',()=>{
 const tab='trade.optionsOrders'
 assert.equal(filterRecords(orders,tab,{...freshRecordFilter(),pair:'BTC/USD',side:'buy'}).length,1)
 assert.equal(filterRecords(orders,tab,{...freshRecordFilter(),pair:'BTC'}).length,0)
 assert.equal(filterRecords(orders,tab,{...freshRecordFilter(),side:'sell'}).length,0)
})
test('option status and inclusive local date range filter independently',()=>{
 const tab='trade.optionsOrders'
 assert.equal(filterRecords(orders,tab,{...freshRecordFilter(),status:'inProgress',from:'2026-11-24',to:'2026-11-24'}).length,1)
 assert.equal(filterRecords(orders,tab,{...freshRecordFilter(),status:'settled'}).length,0)
 assert.equal(filterRecords(orders,tab,{...freshRecordFilter(),to:'2026-11-23'}).length,0)
 assert.equal(filterRecords(orders,tab,{...freshRecordFilter(),from:'2026-11-25'}).length,0)
})
test('position history uses opening time, not record creation time',()=>{
 const order={...orders[1],openedAt:new Date(2026,10,20,12).getTime()}
 assert.equal(filterRecords([order],'trade.futuresHistory',{...freshRecordFilter(),from:'2026-11-20',to:'2026-11-20'}).length,1)
})
