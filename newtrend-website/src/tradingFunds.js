import {reactive} from 'vue'
import {createCurrentTrades,positionPnl} from './utils/mockCurrentTrades.js'
import {tradeFeeRate} from './utils/orderFormModel.js'
import {balanceOf,credit,debit,modeKey} from './mock/ledger.js'

// Trading records per account mode (independent copies of the synthetic fixtures), funded through the shared ledger.
export const tradeOrders=reactive({real:createCurrentTrades(),demo:createCurrentTrades()})
export const tradeOrdersFor=mode=>tradeOrders[modeKey(mode)]

/**
 * What an order locks and what a market fill pays out.
 * futures: margin (+ fee once filled) in USDT · options: stake in USDT
 * spot buy: notional + fee in USDT, base credited on fill · spot sell: base amount, USDT net of fee credited on fill.
 */
export function orderFunding({kind,side,pending,estimate,amount,base}){
 if(kind==='futures')return {lock:{asset:'USDT',amount:estimate.margin+(pending?0:estimate.fee)},fill:null}
 if(kind==='options')return {lock:{asset:'USDT',amount:Number(amount)},fill:null}
 if(side==='buy')return {lock:{asset:'USDT',amount:Number(amount)+estimate.fee},fill:pending?null:{asset:base,amount:estimate.quantity}}
 return {lock:{asset:base,amount:Number(amount)},fill:pending?null:{asset:'USDT',amount:estimate.notional-estimate.fee}}
}

/** Locks funds and records the order atomically; returns false (no change) when the lock is not covered. */
export function placeTradeOrder(mode,record,funding){
 if(!(funding.lock.amount>0)||balanceOf(mode,funding.lock.asset)+1e-9<funding.lock.amount)return false
 if(!debit(mode,funding.lock.asset,funding.lock.amount))return false
 if(funding.fill)credit(mode,funding.fill.asset,funding.fill.amount)
 tradeOrdersFor(mode).unshift({...record,reserved:funding.lock})
 return true
}

/**
 * Funds returned when a current record is finished (see finishCurrentTrade):
 * closing a position returns margin + P&L − closing fee; cancelling returns the unfilled share of the lock
 * and pays out the filled part of a spot order. Seed fixtures without a recorded lock return only their position value.
 */
export function releaseTradeFunds(mode,original){
 const base=original.marketName.split('/')[0]
 if(original.bucket==='positions'){
  const closingFee=original.markPrice*original.quantity*tradeFeeRate
  credit(mode,'USDT',Math.max(0,original.margin+positionPnl(original)-closingFee))
  return
 }
 const filledRatio=original.quantity?Math.min(1,(original.filledQuantity||0)/original.quantity):0
 if(original.reserved)credit(mode,original.reserved.asset,original.reserved.amount*(1-filledRatio))
 if(original.kind==='spot'&&original.filledQuantity){
  if(original.direction==='buy')credit(mode,base,original.filledQuantity)
  else credit(mode,'USDT',original.filledQuantity*original.price*(1-tradeFeeRate))
 }
}
