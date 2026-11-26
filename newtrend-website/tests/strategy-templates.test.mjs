import {test} from 'node:test'
import assert from 'node:assert/strict'
import {strategyValidation,filterStrategies,pickFeatured,createStrategyAccount,subscribeStrategy,changeStrategyStatus} from '../src/utils/strategyTemplates.js'
const product={id:1,name:'Test',min:100,max:200000,minDays:7,maxDays:90,symbols:['BTCUSDT'],fee:.001}
const draft={capital:1000,days:14,takeProfit:10,stopLoss:5}
test('validates capital, frozen budget, integer days and TP/SL boundaries',()=>{
 for(const [field,value,code] of [['capital','NaN','capitalRequired'],['capital',99,'belowMin'],['capital',200001,'aboveMax'],['capital',100001,'paymentRequired'],['days',7.5,'periodOutOfRange'],['days',91,'periodOutOfRange'],['takeProfit',0,'takeProfitOutOfRange'],['takeProfit',101,'takeProfitOutOfRange'],['stopLoss',51,'stopLossOutOfRange'],['stopLoss','Infinity','stopLossOutOfRange']])assert.equal(strategyValidation(product,{...draft,[field]:value},100000).code,code)
 assert.equal(strategyValidation(product,draft,100000),null)
})
test('subscription atomically freezes funds and terms and rejects duplicate requests',()=>{
 const account=createStrategyAccount(),p={...product,symbols:[...product.symbols]}
 const record=subscribeStrategy(account,p,draft,'one',1000)
 assert.equal(account.balance,99000);assert.equal(record.endAt,1000+14*86400000)
 p.symbols.push('ETHUSDT');p.minDays=30
 assert.deepEqual(record.template.symbols,['BTCUSDT']);assert.equal(record.days,14)
 assert.throws(()=>subscribeStrategy(account,p,draft,'one'),/conflict/)
 assert.equal(account.records.length,1);assert.equal(account.balance,99000)
 assert.throws(()=>subscribeStrategy(account,product,{...draft,capital:100000},'two'),/paymentRequired/)
 assert.equal(account.records.length,1);assert.equal(account.balance,99000)
})
test('pause/resume guard transitions and stop returns principal exactly once',()=>{
 const account=createStrategyAccount();subscribeStrategy(account,product,draft,'one')
 changeStrategyStatus(account,'one','pause');assert.equal(account.records[0].status,'paused')
 assert.throws(()=>changeStrategyStatus(account,'one','pause'),/conflict/)
 changeStrategyStatus(account,'one','resume');changeStrategyStatus(account,'one','stop',2000)
 assert.equal(account.balance,100000);assert.equal(account.records[0].stoppedAt,2000)
 assert.throws(()=>changeStrategyStatus(account,'one','stop'),/conflict/)
 assert.throws(()=>changeStrategyStatus(account,'one','resume'),/conflict/)
 assert.equal(account.balance,100000)
})
test('combined filters and all sort dimensions operate without modifying the catalog',()=>{
 const items=[{id:1,style:'a',market:'x',sharpe:1,win:50,min:100,minDays:7},{id:2,style:'a',market:'y',sharpe:2,win:80,min:500,minDays:30}]
 assert.deepEqual(filterStrategies(items,'a','x').map(s=>s.id),[1])
 assert.deepEqual(filterStrategies(items,'b','x'),[])
 for(const key of ['sharpe','winRate','minCapital','period']){
 assert.deepEqual(filterStrategies(items,'','',key+'_desc').map(s=>s.id),[2,1])
 assert.deepEqual(filterStrategies(items,'','',key+'_asc').map(s=>s.id),[1,2])
 }
 assert.deepEqual(items.map(s=>s.id),[1,2])
})
test('capital and period sorts break ties like the reference',()=>{
 const items=[{id:1,min:100,max:500,minDays:7,maxDays:30,sharpe:1,win:1},{id:2,min:100,max:900,minDays:7,maxDays:90,sharpe:1,win:1}]
 assert.deepEqual(filterStrategies(items,'','','minCapital_desc').map(s=>s.id),[2,1])
 assert.deepEqual(filterStrategies(items,'','','minCapital_asc').map(s=>s.id),[1,2])
 assert.deepEqual(filterStrategies(items,'','','period_desc').map(s=>s.id),[2,1])
})
test('featured picks the best Sharpe per style, then tops up to three',()=>{
 const s=(id,style,sharpe)=>({id,style:'aiQuant.style.'+style,sharpe})
 assert.deepEqual(pickFeatured([s(1,'conservative',1.8),s(2,'conservative',1.5),s(3,'balanced',1.4),s(4,'aggressive',1)]).map(x=>x.id),[1,3,4])
 assert.deepEqual(pickFeatured([s(1,'conservative',1.8),s(2,'conservative',1.5),s(3,'balanced',1.4)]).map(x=>x.id),[1,3,2])
})
test('login redirect accepts only same-site absolute paths',async()=>{
 const {safeRedirect}=await import('../src/utils/redirect.js')
 assert.equal(safeRedirect('/ai-quant/strategy'),'/ai-quant/strategy')
 for(const bad of ['//evil.example','https://evil.example','ai-quant','/a\\b','/a\nb',undefined,['//x']])assert.equal(safeRedirect(bad),null)
})

test('buildDailyStats lists trading days newest first and sums exactly to the strategy P&L', async () => {
  const {buildDailyStats, summarizeDailyStats} = await import('../src/utils/strategyTemplates.js')
  const DAY = 86400000, end = Date.UTC(2026, 10, 26), start = end - 30 * DAY
  for (const totalPnl of [36.2, -8.5, 12.4]) {
    const items = buildDailyStats({startAt: start, endAt: end, totalPnl, seed: 42})
    assert.ok(items.length > 0)
    assert.deepEqual([...items].sort((a, b) => b.date.localeCompare(a.date)), items)
    assert.equal(summarizeDailyStats(items).totalPnl, totalPnl)
    assert.ok(items.every(i => i.tradeCount >= 1))
    assert.deepEqual(buildDailyStats({startAt: start, endAt: end, totalPnl, seed: 42}), items)
  }
  assert.deepEqual(buildDailyStats({startAt: end, endAt: end, totalPnl: 0}), [])
})
