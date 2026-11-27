// Record tab labels omit the product name (user decision, 2026-11-27): each page already shows only its own product.
export const tradeProducts = {
  futures: {title:'trade.pages.perpetual',tabs:[
    {id:'positions',label:'trade.recordTabs.positions',bucket:'positions'},
    {id:'orders',label:'trade.recordTabs.openOrders',bucket:'openOrders'},
    {id:'orderHistory',label:'trade.recordTabs.orderHistory',bucket:'orderHistory'},
    {id:'history',label:'trade.recordTabs.positionHistory',bucket:'positionHistory'},
  ]},
  options: {title:'trade.pages.delivery',tabs:[
    {id:'current',label:'trade.recordTabs.current',bucket:'optionsOrders',settled:false},
    {id:'history',label:'trade.recordTabs.history',bucket:'optionsOrders',settled:true},
  ]},
  spot: {title:'common.spotTrading',tabs:[
    {id:'orders',label:'trade.recordTabs.openOrders',bucket:'spotOpenOrders'},
    {id:'history',label:'trade.recordTabs.orderHistory',bucket:'spotOrdersHistory'},
  ]},
}

export function selectProductRecords(rows,mode,tabId) {
  const tab=tradeProducts[mode]?.tabs.find(tab=>tab.id===tabId)
  if(!tab)return []
  return rows.filter(row=>row.kind===mode&&row.bucket===tab.bucket&&(tab.settled===undefined||Boolean(row.settled)===tab.settled))
    .sort((a,b)=>(b.createdAt||0)-(a.createdAt||0))
}

// Category shown for a trading pair (metals are split out of the crypto list), shared by the pair pickers.
export const tradeMarketCategory=m=>['XAU','XAG','XAUT','PAXG'].includes(m.symbol)?'trade.pages.metals':m.category
export const tradeMarketCategories=['home.products.perpTag1','aiQuant.market.forex','trade.pages.metals','trade.pages.energy']
