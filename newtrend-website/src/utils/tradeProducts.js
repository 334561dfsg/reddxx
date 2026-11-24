export const tradeProducts = {
  futures: {title:'trade.pages.perpetual',tabs:[
    {id:'positions',label:'trade.futuresPositions',bucket:'positions'},
    {id:'orders',label:'trade.futuresOrders',bucket:'openOrders'},
    {id:'orderHistory',label:'trade.futuresOrdersHistory',bucket:'orderHistory'},
    {id:'history',label:'trade.futuresHistory',bucket:'positionHistory'},
  ]},
  options: {title:'trade.pages.delivery',tabs:[
    {id:'current',label:'trade.pages.deliveryCurrent',bucket:'optionsOrders',settled:false},
    {id:'history',label:'trade.pages.deliveryHistory',bucket:'optionsOrders',settled:true},
  ]},
  spot: {title:'common.spotTrading',tabs:[
    {id:'orders',label:'trade.spotOrders',bucket:'spotOpenOrders'},
    {id:'history',label:'trade.spotOrdersHistory',bucket:'spotOrdersHistory'},
  ]},
}

export function selectProductRecords(rows,mode,tabId) {
  const tab=tradeProducts[mode]?.tabs.find(tab=>tab.id===tabId)
  if(!tab)return []
  return rows.filter(row=>row.kind===mode&&row.bucket===tab.bucket&&(tab.settled===undefined||Boolean(row.settled)===tab.settled))
    .sort((a,b)=>(b.createdAt||0)-(a.createdAt||0))
}
