// Synthetic fixtures; structure observed on GMXX delivery, perpetual and spot history.
const round=(n,d=2)=>Number(n.toFixed(d))
const symbols=[['BTC/USDT',60120,.025],['ETH/USDT',1685,.8],['SOL/USDT',70.4,12],['BNB/USDT',546,2]]
const start=Date.now()-86400000
export const historyBuckets=['positionHistory','orderHistory','optionsOrders','spotOrdersHistory']
export const mockTradeHistory=historyBuckets.flatMap((bucket,b)=>Array.from({length:12},(_,i)=>{
 const [marketName,base,qty]=symbols[i%4],direction=i%3===0?'sell':'buy',price=round(base*(1-i*.0007)),close=round(price*(1+([.004,-.003,0][i%3]))),quantity=round(qty*(1+i%3),6),fee=round(price*quantity*.0005),duration=[30,60,120,300][i%4],createdAt=start-i*8640000-b*1800000,cancelled=['orderHistory','spotOrdersHistory'].includes(bucket)&&i%4===3
 const kind=bucket==='optionsOrders'?'options':bucket==='spotOrdersHistory'?'spot':'futures',stake=[100,300,500][i%3]
 return {id:`history-${bucket}-${i}`,kind,bucket,marketName,direction,createdAt,openedAt:createdAt,closedAt:createdAt+(kind==='options'?duration*1000:5400000),price,closePrice:kind==='options'?round(price*(1+([.004,-.003,0][i%3])*(direction==='buy'?1:-1))):close,quantity,filledQuantity:cancelled?0:quantity,fee:cancelled?0:kind==='options'?round(stake*.005):fee,amount:stake,leverage:[10,20,50][i%3],duration,orderType:i%2?'trade.limit':'trade.market',recordStatus:cancelled?'trade.cancelled':'trade.filled',settled:true,pnl:kind==='options'?[round(stake*.15-stake*.005),-stake,0][i%3]:round((close-price)*quantity*(direction==='buy'?1:-1)-fee),notional:round(price*quantity),event:i%2?'trade.history.openFill':'trade.history.fullClose'}
}))
export function historyFields(o){
 const field=(label,value,type='number',unit='')=>({label,value,type,unit})
 const time=(label,value)=>field(label,value,'date')
 if(o.bucket==='optionsOrders'&&!o.settled)return [time('trade.openTime',o.openedAt??o.createdAt),field('trade.entryPrice',o.price),field('trade.amount',o.amount,'number','USDT'),field('trade.fee',o.fee,'number','USDT'),field('trade.status','trade.inProgress','key')]
 if(o.bucket==='optionsOrders')return [time('trade.openTime',o.openedAt??o.createdAt),field('trade.entryPrice',o.price),field('trade.fee',o.fee,'number','USDT'),time('trade.closeTime',o.closedAt),field('trade.closePrice',o.closePrice),field('trade.amount',o.amount,'number','USDT'),field('trade.history.pnl',o.pnl,'pnl','USDT')]
 if(o.bucket==='positionHistory')return [field('trade.history.averagePrice',o.price),field('trade.history.pnl',o.event==='trade.history.openFill'?null:o.pnl,'pnl','USDT'),field('trade.history.positionValue',o.notional,'number','USDT'),field('trade.fee',o.fee,'number','USDT'),field('trade.history.averageClosePrice',o.event==='trade.history.openFill'?null:o.closePrice),field('trade.quantity',o.quantity),time('trade.history.time',o.closedAt??o.createdAt)]
 if(o.bucket==='orderHistory')return [time('trade.orderTime',o.createdAt),field('trade.history.orderQuantity',o.quantity),field('trade.orderPrice',o.price),field('trade.history.averagePrice',o.filledQuantity?o.price:null),field('trade.history.filledQuantity',o.filledQuantity),field('trade.orderType',o.orderType,'key'),field('trade.status',o.recordStatus,'key')]
 return [time('trade.history.transactionTime',o.createdAt),field('trade.history.orderQuantity',o.quantity),field('trade.history.filledQuantity',o.filledQuantity),field('trade.history.averagePrice',o.filledQuantity?o.price:null)]
}
