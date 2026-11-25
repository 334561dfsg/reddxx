import test from 'node:test'
import assert from 'node:assert/strict'
import {createEarnPortfolio,earnSummary,redemptionQuote,redeemLocalHolding} from '../src/utils/mockEarnPortfolio.js'
const now=Date.parse('2026-11-25T04:00:00Z')
const products=[{id:'usdt',rate:.0123},{id:'usdt90',rate:.0232},{id:'usdt180',rate:.0273},{id:'usdt30',rate:.0164},{id:'btc',rate:.0049},{id:'eth',rate:.006}]
test('fixtures cover all tabs and statuses, dates remain relative and instances isolated',()=>{
 const state=createEarnPortfolio(now),other=createEarnPortfolio(now)
 assert.equal(state.holdings.length,6)
 assert.equal(state.orders.length,8)
 assert.equal(state.redemptions.length,4)
 assert.equal(state.rewards.length,10)
 assert.ok(state.orders.some(x=>x.status==='pending_review'))
 assert.ok(state.orders.some(x=>x.status==='rejected'))
 assert.ok(state.holdings.find(x=>x.status==='matured').maturityAt<now)
 state.holdings[0].principal=0
 assert.equal(other.holdings[0].principal,12000)
})
test('summary values are derived from active ownership and paid rewards',()=>{
 const state=createEarnPortfolio(now),summary=earnSummary(state,products)
 assert.equal(summary.principal,12000+15000+20000+5000+.18*60742.62+2*1708.29)
 assert.equal(summary.total,summary.principal+summary.accrued)
 const paid=state.rewards.filter(x=>x.status==='paid')
 assert.ok(summary.cumulative>0)
 state.rewards=paid
 assert.equal(earnSummary(state,products).cumulative,summary.cumulative)
})
test('partial redemption updates principal, accrued rewards and records once',()=>{
 const state=createEarnPortfolio(now),holding=state.holdings[0]
 const result=redeemLocalHolding(state,holding.id,3000,{id:'request-1',now})
 assert.equal(result.record.reward,9.225)
 assert.equal(holding.principal,9000)
 assert.equal(holding.accrued,27.675)
 assert.equal(holding.status,'active')
 assert.equal(state.redemptions.length,5)
 assert.equal(state.rewards[0].amount,9.225)
 redeemLocalHolding(state,holding.id,3000,{id:'request-1',now})
 assert.equal(holding.principal,9000)
 assert.equal(state.redemptions.length,5)
})
test('locked and processing positions reject redemption without mutation',()=>{
 const state=createEarnPortfolio(now),before=JSON.stringify(state)
 assert.equal(redemptionQuote(state.holdings[1],15000,now).error,'disabled')
 assert.equal(redemptionQuote(state.holdings[5],2,now).error,'holdingInactive')
 assert.equal(redemptionQuote(state.holdings[0],13000,now).error,'exceedsPrincipal')
 assert.equal(redemptionQuote(state.holdings[0],-1,now).error,'invalidAmount')
 assert.equal(redemptionQuote(state.holdings[0],0.000000001,now).error,'invalidAmount')
 assert.equal(redemptionQuote(state.holdings[0],1.000000001,now).error,'invalidAmount')
 assert.equal(JSON.stringify(state),before)
})
test('early redemption needs explicit confirmation and forfeits accrued reward',()=>{
 const state=createEarnPortfolio(now),holding=state.holdings[2]
 assert.equal(redeemLocalHolding(state,holding.id,20000,{id:'early',now}).error,'earlyConfirmationRequired')
 assert.equal(holding.principal,20000)
 const result=redeemLocalHolding(state,holding.id,20000,{id:'early',now,acknowledgeEarly:true})
 assert.equal(result.record.reward,0)
 assert.equal(result.record.type,'fixedEarly')
 assert.equal(holding.status,'redeemed')
 assert.equal(holding.accrued,0)
})
test('matured redemption pays principal and reward and removes it from valuation',()=>{
 const state=createEarnPortfolio(now),holding=state.holdings[3]
 const before=earnSummary(state,products)
 const result=redeemLocalHolding(state,holding.id,holding.principal,{id:'maturity',now})
 assert.equal(result.record.reward,24.6)
 assert.equal(result.record.type,'fixedMatured')
 assert.equal(earnSummary(state,products).principal,before.principal-5000)
 assert.equal(redemptionQuote(holding,5000,now).error,'holdingInactive')
})
