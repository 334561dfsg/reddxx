import test from 'node:test'
import assert from 'node:assert/strict'
import { tradeProducts, selectProductRecords } from '../src/utils/tradeProducts.js'
import { createTradePageState, createOrderDrafts, fillLimitPrice, useTradePageState, useOrderDrafts } from '../src/composables/tradePageState.js'
import { findTradingMarket, marketSlug, tradePath } from '../src/utils/tradeRoutes.js'
import { filterPairs, nextSort, pairRows, pairTabs } from '../src/utils/pairList.js'
import { bookSide, formatBookTotal } from '../src/utils/orderBook.js'

test('each product exposes only its own records, with current and settled delivery separated', () => {
  const rows = [
    {id:'position',kind:'futures',bucket:'positions'},
    {id:'delivery',kind:'options',bucket:'optionsOrders',settled:false},
    {id:'settled',kind:'options',bucket:'optionsOrders',settled:true},
    {id:'spot',kind:'spot',bucket:'spotOpenOrders'},
    {id:'cancelled',kind:'spot',bucket:'spotOrdersHistory',recordStatus:'trade.cancelled'},
  ]
  for (const mode of Object.keys(tradeProducts)) {
    for (const tab of tradeProducts[mode].tabs) assert.ok(selectProductRecords(rows,mode,tab.id).every(row=>row.kind===mode))
  }
  assert.deepEqual(selectProductRecords(rows,'options','current').map(x=>x.id),['delivery'])
  assert.deepEqual(selectProductRecords(rows,'options','history').map(x=>x.id),['settled'])
  assert.deepEqual(selectProductRecords(rows,'spot','history').map(x=>x.id),['cancelled'])
  assert.deepEqual(selectProductRecords(rows,'spot','invalid'),[])
})

test('product view state and order drafts are independent', () => {
  const futures=createTradePageState('futures'),spot=createTradePageState('spot')
  futures.symbol='ETHUSD';futures.pages.positions=3;futures.interval='trade.interval_1d'
  assert.equal(spot.symbol,'BTCUSD');assert.equal(spot.pages.positions,undefined)
  assert.equal(spot.interval,'trade.interval_1h')
  const drafts=createOrderDrafts()
  drafts.futures.amount='250';drafts.spot.buy.amount='100';drafts.options.duration=60
  assert.equal(drafts.spot.sell.amount,'');assert.equal(drafts.options.amount,'')
  assert.equal(createOrderDrafts().futures.amount,'')
})

test('returning to a product restores its session state and draft without sharing view filters', () => {
  const futures=useTradePageState('futures')
  futures.symbol='ETHUSD';futures.record='history';futures.pages.history=2
  useOrderDrafts().futures.amount='321'
  const spot=useTradePageState('spot')
  assert.equal(spot.record,'orders')
  assert.equal(useTradePageState('futures'),futures)
  assert.equal(useTradePageState('futures').pages.history,2)
  assert.equal(useOrderDrafts().futures.amount,'321')
  assert.equal(useOrderDrafts().spot.buy.amount,'')
})

test('a picked book price fills the futures or spot limit price, never delivery', () => {
  const drafts=useOrderDrafts()
  fillLimitPrice('futures',61234.5)
  assert.equal(drafts.futures.type,'limit');assert.equal(drafts.futures.price,'61234.5')
  drafts.spot.side='sell';fillLimitPrice('spot',0.25)
  assert.equal(drafts.spot.type,'limit');assert.equal(drafts.spot.sell.price,'0.25');assert.equal(drafts.spot.buy.price,'')
  const before=JSON.stringify(drafts.options);fillLimitPrice('options',1)
  assert.equal(JSON.stringify(drafts.options),before)
})

const catalogue=[
  {id:'BTCUSD',name:'BTC/USDT',symbol:'BTC',price:60000,change:-1,volume:1600000000,category:'home.products.perpTag1'},
  {id:'ETHUSD',name:'ETH/USDT',symbol:'ETH',price:1700,change:2,volume:700000000,category:'home.products.perpTag1'},
  {id:'XAUUSD',name:'XAU/USD',symbol:'XAU',price:2400,change:.5,volume:'—',category:'home.products.perpTag1'},
  {id:'EURUSD',name:'EUR/USD',symbol:'EUR',price:1.09,change:.1,volume:50000000,category:'aiQuant.market.forex'},
]

test('trade routes: one canonical slug per pair, legacy ids still resolve', () => {
  assert.equal(marketSlug(catalogue[0]),'BTCUSDT')
  assert.equal(findTradingMarket(catalogue,'BTCUSDT'),catalogue[0])
  assert.equal(findTradingMarket(catalogue,'BTCUSD'),catalogue[0])
  assert.equal(findTradingMarket(catalogue,'NOPE'),null)
  assert.equal(findTradingMarket(catalogue,undefined),null)
  assert.equal(tradePath('spot',catalogue[1]),'/trade/spot/ETHUSDT')
  assert.equal(tradePath('options',catalogue[1],{chart:true}),'/trade/options/ETHUSDT/chart')
})

test('pair list: live prices, categories, search, favourites and the sort cycle', () => {
  const rows=pairRows(catalogue,{ETHUSD:{price:1750,change:3.456}})
  assert.equal(rows[1].price,1750);assert.equal(rows[1].change,3.46);assert.equal(rows[0].price,60000)
  assert.equal(rows[2].volume,null,'snapshot-only volume')
  assert.equal(rows[2].category,'trade.pages.metals','metals are split out of crypto')
  assert.deepEqual(pairTabs(rows),['all','home.products.perpTag1','aiQuant.market.forex','trade.pages.metals'])
  assert.deepEqual(filterPairs(rows,{query:'eth/'}).map(r=>r.id),['ETHUSD'])
  assert.deepEqual(filterPairs(rows,{query:'btcusdt'}).map(r=>r.id),['BTCUSD'])
  assert.deepEqual(filterPairs(rows,{tab:'favorites',favorites:['EURUSD']}).map(r=>r.id),['EURUSD'])
  assert.deepEqual(filterPairs(rows,{tab:'aiQuant.market.forex'}).map(r=>r.id),['EURUSD'])
  assert.deepEqual(filterPairs(rows,{sort:{key:'volume',desc:true}}).map(r=>r.id),['BTCUSD','ETHUSD','EURUSD','XAUUSD'],'missing volume sorts last')
  assert.deepEqual(filterPairs(rows,{sort:{key:'change',desc:false}}).map(r=>r.id),['BTCUSD','EURUSD','XAUUSD','ETHUSD'])
  let sort={key:'',desc:true}
  sort=nextSort(sort,'price');assert.deepEqual(sort,{key:'price',desc:true})
  sort=nextSort(sort,'price');assert.deepEqual(sort,{key:'price',desc:false})
  sort=nextSort(sort,'price');assert.deepEqual(sort,{key:'',desc:true})
  assert.deepEqual(nextSort({key:'price',desc:false},'name'),{key:'name',desc:true})
})

test('order book sides keep the levels nearest the spread with cumulative depth', () => {
  const asks=[[105,1],[104,2],[103,1],[102,4],[101,2]],bids=[[100,3],[99,1],[98,2],[97,5]]
  const ask=bookSide(asks,'ask',3)
  assert.deepEqual(ask.map(r=>r.price),[103,102,101],'asks stay farthest-first')
  assert.deepEqual(ask.map(r=>r.cumQty),[7,6,2],'cumulative from the spread outwards')
  assert.equal(ask[0].share,100);assert.equal(ask[2].share,28.57)
  assert.equal(ask[2].cumValue,202)
  const bid=bookSide(bids,'bid',2)
  assert.deepEqual(bid.map(r=>[r.price,r.cumQty,r.share]),[[100,3,75],[99,4,100]])
  assert.deepEqual(bookSide([],'bid',7),[])
})

test('book totals stay short: 2 decimals from 1, at most 4 below, then <0.0001', () => {
  assert.equal(formatBookTotal(3055.724),'3,055.72')
  assert.equal(formatBookTotal(8.2),'8.20')
  assert.equal(formatBookTotal(0.00255906),'0.0026')
  assert.equal(formatBookTotal(0.0494),'0.0494')
  assert.equal(formatBookTotal(0.00000051),'<0.0001')
  assert.equal(formatBookTotal(0),'0')
})

test('chart price-axis labels get enough decimals for the grid step', async () => {
  const { axisDecimals } = await import('../src/utils/chartAxis.js')
  assert.equal(axisDecimals(2200), 0, 'BTC: whole numbers')
  assert.equal(axisDecimals(1), 0)
  assert.equal(axisDecimals(0.5), 2, 'about 1 unit apart: 0.50, 1.00 …')
  assert.equal(axisDecimals(0.017), 3, 'EUR/USD around 1.09')
  assert.equal(axisDecimals(0.0005), 5)
  assert.equal(axisDecimals(2e-7), 8, 'capped like the price formatter')
  assert.equal(axisDecimals(0), 0);assert.equal(axisDecimals(NaN), 0)
})
