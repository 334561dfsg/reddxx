export const recordTabs = {
  'trade.futuresPositions': {kind:'futures',bucket:'positions',sideLabel:'trade.positionSide',sides:['trade.long','trade.short']},
  'trade.futuresHistory': {kind:'futures',bucket:'positionHistory',sideLabel:'trade.positionSide',sides:['trade.long','trade.short'],dateLabel:'trade.openTime'},
  'trade.futuresOrders': {kind:'futures',bucket:'openOrders',sideLabel:'trade.positionSide',sides:['trade.long','trade.short']},
  'trade.futuresOrdersHistory': {kind:'futures',bucket:'orderHistory',sideLabel:'trade.positionSide',sides:['trade.long','trade.short'],dateLabel:'trade.orderTime'},
  'trade.optionsOrders': {kind:'options',bucket:'optionsOrders',sideLabel:'trade.direction',sides:['trade.up','trade.down'],dateLabel:'trade.orderTime',statuses:true},
  'trade.spotOrders': {kind:'spot',bucket:'spotOpenOrders',sideLabel:'trade.direction',sides:['trade.buy','trade.sell']},
  'trade.spotOrdersHistory': {kind:'spot',bucket:'spotOrdersHistory',sideLabel:'trade.direction',sides:['trade.buy','trade.sell'],dateLabel:'trade.orderTime'},
}
export const freshRecordFilter=()=>({pair:'',side:'',status:'all',from:'',to:''})
export function filterRecords(orders,tab,filter){
  const config=recordTabs[tab]
  return orders.filter(o=>{
    if(o.kind!==config.kind||o.bucket!==config.bucket)return false
    if(filter.pair&&o.marketName!==filter.pair)return false
    if(filter.side&&o.direction!==filter.side)return false
    if(config.statuses&&filter.status!=='all'&&(o.settled?'settled':'inProgress')!==filter.status)return false
    if(config.dateLabel&&(filter.from||filter.to)){
      const date=new Date(config.dateLabel==='trade.openTime'?(o.openedAt??o.createdAt):o.createdAt)
      if(!Number.isFinite(date.getTime()))return false
      const day=`${date.getFullYear()}-${String(date.getMonth()+1).padStart(2,'0')}-${String(date.getDate()).padStart(2,'0')}`
      if(filter.from&&day<filter.from||filter.to&&day>filter.to)return false
    }
    return true
  })
}
