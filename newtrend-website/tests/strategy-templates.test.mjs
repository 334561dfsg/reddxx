import {test} from 'node:test'
import assert from 'node:assert/strict'
import {strategyValidation,filterStrategies,createStrategyAccount,subscribeStrategy,changeStrategyStatus} from '../src/utils/strategyTemplates.js'
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
