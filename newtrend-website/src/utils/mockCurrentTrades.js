// Local-only fixtures and deterministic lifecycle transitions. No remote account data.
const round=(n,d=2)=>Number(n.toFixed(d))
export function createCurrentTrades(now=Date.now()){
 const markets=[['BTC/USDT',60120,.025],['ETH/USDT',1685,.8],['SOL/USDT',70.4,12],['BNB/USDT',546,2],['XRP/USDT',2.08,240],['DOGE/USDT',.3842,1200]]
 const rows=['positions','openOrders','spotOpenOrders'].flatMap((bucket,b)=>markets.map(([marketName,price,quantity],i)=>{
  const position=bucket==='positions',filledQuantity=position?quantity:i%3===1?round(quantity*.4,6):0
  return {
   id:`current-${bucket}-${i}`,bucket,kind:b===2?'spot':'futures',marketName,
   direction:i%2?'sell':'buy',price,quantity,filledQuantity,
   markPrice:round(price*(i%3===0?1.012:1.006),6),leverage:[10,20,50][i%3],
   notional:round(price*quantity),margin:round(price*quantity/[10,20,50][i%3]),
   fee:round(price*filledQuantity*.0005),createdAt:now-(i+1)*3600000-b*600000,
   orderType:position&&i%2===0?'trade.market':'trade.limit',
   recordStatus:position?'trade.filled':filledQuantity?'trade.current.partiallyFilled':'trade.current.pending',settled:false
  }
 }))
 return [...rows,...markets.slice(0,3).map(([marketName,price],i)=>({
  id:`current-options-${i}`,kind:'options',bucket:'optionsOrders',marketName,
  direction:i%2?'sell':'buy',price,amount:[100,300,500][i],duration:[300,600,900][i],
  createdAt:now-(i+1)*10000,openedAt:now-(i+1)*10000,
  fee:0,settled:false,recordStatus:'trade.inProgress'
 }))]
}
export function positionPnl(o){return round((o.markPrice-o.price)*o.quantity*(o.direction==='buy'?1:-1))}
export function finishCurrentTrade(orders,id,now=Date.now()){
 const index=orders.findIndex(o=>o.id===id&&['positions','openOrders','spotOpenOrders'].includes(o.bucket))
 if(index<0)return false
 const o=orders[index],closing=o.bucket==='positions'
 const record={...o,id:`closed-${o.id}`,bucket:closing?'positionHistory':o.kind==='spot'?'spotOrdersHistory':'orderHistory',
  closedAt:now,settled:true,recordStatus:closing?'trade.filled':'trade.cancelled',
  filledQuantity:closing?o.quantity:o.filledQuantity||0,
  fee:closing?round(o.fee+o.markPrice*o.quantity*.0005):round(o.price*(o.filledQuantity||0)*.0005),
  closePrice:closing?o.markPrice:undefined,event:closing?'trade.history.fullClose':undefined}
 if(closing)record.pnl=round(positionPnl(o)-record.fee)
 orders.splice(index,1,record)
 return true
}
