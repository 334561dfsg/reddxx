// Public catalog snapshot, 2026-11-26. Account records are never copied.
export const strategyTerms = [
 [100000,14,180,1,['SPX500','US30']], [50000,7,90,1,['BTCUSDT','ETHUSDT']],
 [150000,7,90,2,['SPX500','NAS100','GER40']], [30000,7,60,1,['EURUSD','USDJPY']],
 [100000,5,60,3,['BTCUSDT','ETHUSDT','SOLUSDT','BNBUSDT']], [50000,5,45,3,['EURUSD','GBPUSD','AUDUSD']],
 [300000,5,60,4,['NAS100','SPX500']], [200000,3,30,6,['BTCUSDT','ETHUSDT','SOLUSDT','DOGEUSDT']],
 [100000,3,21,8,['EURUSD','GBPUSD','USDJPY']],
]
export function enrichStrategies(items) {
 return items.map((s,i)=>{const [max,minDays,maxDays,trades,symbols]=strategyTerms[i];return {...s,max,minDays,maxDays,trades,symbols,fee:.001,maxOpenTrades:3}})
}
export function filterStrategies(items,style='',market='',sort='sharpe_desc') {
 const [key,direction]=sort.split('_'),sign=direction==='asc'?1:-1
 // Reference comparator: capital ties fall back to maximum capital, period ties to maximum days; other ties keep catalog order.
 const compare={sharpe:(a,b)=>a.sharpe-b.sharpe,winRate:(a,b)=>a.win-b.win,minCapital:(a,b)=>a.min-b.min||a.max-b.max,period:(a,b)=>a.minDays-b.minDays||a.maxDays-b.maxDays}[key]||((a,b)=>a.sharpe-b.sharpe)
 return items.filter(s=>(!style||s.style===style)&&(!market||s.market===market)).sort((a,b)=>compare(a,b)*sign||a.id-b.id)
}
/** Reference spotlight: best Sharpe per style (conservative, balanced, aggressive), then top up to three by Sharpe. */
export function pickFeatured(items) {
 const bySharpe=(a,b)=>b.sharpe-a.sharpe||a.id-b.id,picked=[]
 for(const style of ['conservative','balanced','aggressive']){const best=items.filter(s=>s.style.split('.').at(-1)===style).sort(bySharpe)[0];if(best)picked.push(best)}
 const rest=items.filter(s=>!picked.includes(s)).sort(bySharpe)
 while(picked.length<3&&rest.length)picked.push(rest.shift())
 return picked
}
export function strategyValidation(product,draft,balance) {
 const capital=Number(draft.capital),days=Number(draft.days),tp=Number(draft.takeProfit),sl=Number(draft.stopLoss)
 if(!Number.isFinite(capital)||capital<=0)return {code:'capitalRequired',field:'capital'}
 if(capital<product.min)return {code:'belowMin',field:'capital',params:{min:product.min}}
 if(capital>product.max)return {code:'aboveMax',field:'capital',params:{max:product.max}}
 if(capital>balance)return {code:'paymentRequired',field:'capital'}
 if(!Number.isInteger(days)||days<product.minDays||days>product.maxDays)return {code:'periodOutOfRange',field:'days',params:{min:product.minDays,max:product.maxDays}}
 if(!Number.isFinite(tp)||tp<1||tp>100)return {code:'takeProfitOutOfRange',field:'takeProfit'}
 if(!Number.isFinite(sl)||sl<1||sl>50)return {code:'stopLossOutOfRange',field:'stopLoss'}
 return null
}
export function createStrategyAccount(balance=100000){return {balance,records:[],requests:[]}}
export function subscribeStrategy(account,product,draft,requestId,now=Date.now()) {
 if(account.requests.includes(requestId))throw new Error('conflict')
 const error=strategyValidation(product,draft,account.balance)
 if(error)throw Object.assign(new Error(error.code),error)
 const record={id:requestId,template:{...product,symbols:[...product.symbols]},capital:Number(draft.capital),days:Number(draft.days),takeProfit:Number(draft.takeProfit),stopLoss:Number(draft.stopLoss),status:'running',pnl:0,createdAt:now,endAt:now+Number(draft.days)*86400000}
 account.balance=Number((account.balance-record.capital).toFixed(8));account.records.unshift(record);account.requests.push(requestId)
 return record
}
export function changeStrategyStatus(account,id,action,now=Date.now()) {
 const record=account.records.find(s=>s.id===id)
 const allowed={pause:['running'],resume:['paused'],stop:['running','paused']}
 if(!record||!allowed[action]?.includes(record.status))throw new Error('conflict')
 record.status={pause:'paused',resume:'running',stop:'completed'}[action]
 if(action==='stop'){account.balance=Number((account.balance+record.capital+record.pnl).toFixed(8));record.stoppedAt=now}
}
