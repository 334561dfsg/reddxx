import test from 'node:test'
import assert from 'node:assert/strict'
import {createC2COrder,cancelC2COrder} from '../src/utils/c2cState.js'
const makeState=()=>({orders:[],balances:{USDT:10000}})
const payer={country:'HK',name:'Chan Tai Man',email:'chan@example.com'}
const quote={id:'USDT-USD',symbol:'USDT',fiat:'USD',price:.99,min:3000,max:1e8}
test('sell locks balance once and waits for review',()=>{const state=makeState();const args={side:'sell',quote,quantity:3000,requestId:'one',payer};const order=createC2COrder(state,args);assert.equal(order.status,'pending_review');assert.equal(order.locked,3000);assert.equal(state.balances.USDT,7000);assert.equal(order.amount,2970);assert.throws(()=>createC2COrder(state,args));assert.equal(state.balances.USDT,7000)})
test('insufficient balances never create sell orders',()=>{const state=makeState();assert.throws(()=>createC2COrder(state,{side:'sell',quote,quantity:11000,requestId:'b',payer}));assert.equal(state.orders.length,0);assert.equal(state.balances.USDT,10000)})
test('buy waits for review without touching balances',()=>{const state=makeState();const order=createC2COrder(state,{side:'buy',quote,quantity:3000,requestId:'buy',payer});assert.equal(order.status,'pending_review');assert.equal(order.locked,0);assert.equal(state.balances.USDT,10000)})
test('cancelling a pending sell refunds the lock once; finished orders cannot be cancelled',()=>{const state=makeState();const order=createC2COrder(state,{side:'sell',quote,quantity:3000,requestId:'c',payer});cancelC2COrder(state,order.id);assert.equal(order.status,'cancelled');assert.equal(state.balances.USDT,10000);assert.throws(()=>cancelC2COrder(state,order.id),{message:'c2c.error.OTC_ORDER_NOT_OPERABLE'});assert.equal(state.balances.USDT,10000);assert.throws(()=>cancelC2COrder(state,'missing'),{message:'notFound'})})
