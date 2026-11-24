// Local-only fixtures and deterministic lifecycle transitions. No remote account data.
const round=(n,d=2)=>Number(n.toFixed(d))
export function createCurrentTrades(){
 return ['positions','openOrders','spotOpenOrders'].flatMap((bucket,b)=>[
  ['BTC/USD',60120,.025],['ETH/USD',1685,.8],['SOL/USD',70.4,12]
 ].map(([marketName,price,quantity],i)=>({
  id:`current-${bucket}-${i}`,bucket,kind:b===2?'spot':'futures',marketName,
  direction:i===1?'sell':'buy',price,quantity,filledQuantity:0,
  markPrice:round(price*(i===1?1.006:1.012)),leverage:[10,20,50][i],
  notional:round(price*quantity),margin:round(price*quantity/[10,20,50][i]),
  fee:round(price*quantity*.0005),createdAt:Date.parse('2026-11-24T08:00:00+08:00')-i*3600000-b*600000,
  orderType:'trade.limit',recordStatus:'trade.current.pending',settled:false
 })))
}
export function positionPnl(o){return round((o.markPrice-o.price)*o.quantity*(o.direction==='buy'?1:-1))}
export function finishCurrentTrade(orders,id,now=Date.now()){
 const index=orders.findIndex(o=>o.id===id&&['positions','openOrders','spotOpenOrders'].includes(o.bucket))
 if(index<0)return false
 const o=orders[index],closing=o.bucket==='positions'
 const record={...o,id:`closed-${o.id}`,bucket:closing?'positionHistory':o.kind==='spot'?'spotOrdersHistory':'orderHistory',
  closedAt:now,settled:true,recordStatus:closing?'trade.filled':'trade.cancelled',
  filledQuantity:closing?o.quantity:o.filledQuantity||0,
  fee:closing?round(o.fee+o.markPrice*o.quantity*.0005):o.fee*(o.filledQuantity||0)/o.quantity,
  closePrice:closing?o.markPrice:undefined,event:closing?'trade.history.fullClose':undefined}
 if(closing)record.pnl=round(positionPnl(o)-record.fee)
 orders.splice(index,1,record)
 return true
}
