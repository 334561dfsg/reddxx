import test from 'node:test'
import assert from 'node:assert/strict'
import {nextQuote,priceDirection} from '../src/composables/quoteModel.js'
test('flash follows the last tick even when the daily performance is negative',()=>{
 const initial={price:100,change:-10},next=nextQuote(initial,1)
 assert.equal(priceDirection(initial.price,next.price),'up')
 assert.ok(next.change<0)
 assert.equal(initial.price,100)
})
test('equal or invalid prices do not flash',()=>{
 assert.equal(priceDirection(10,10),null)
 assert.equal(priceDirection(undefined,10),null)
 assert.equal(priceDirection(10,NaN),null)
 assert.equal(priceDirection(10,9),'down')
})
test('demo updates preserve a fixed daily reference and positive prices',()=>{
 let quote={price:.000001,change:-2}
 for(let i=0;i<20;i++)quote=nextQuote(quote,-1)
 assert.ok(quote.price>0)
 const reference=quote.reference
 quote=nextQuote(quote,1)
 assert.equal(quote.reference,reference)
 assert.equal(quote.delta,quote.price-reference)
})
