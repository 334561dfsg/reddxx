import test from 'node:test'
import assert from 'node:assert/strict'
import {orderEstimate,validStops,deliveryPeriods} from '../src/utils/orderFormModel.js'
test('futures amount is notional; leverage changes margin, not size',()=>{
 const a=orderEstimate({kind:'futures',amount:1000,price:50000,leverage:100});assert.equal(a.quantity,.02);assert.equal(a.margin,10);assert.equal(a.fee,.5)
 const b=orderEstimate({kind:'futures',amount:1000,price:50000,leverage:200});assert.equal(b.quantity,a.quantity);assert.equal(b.margin,5)
})
test('spot buy uses quote currency, sell uses base currency',()=>{
 assert.equal(orderEstimate({kind:'spot',side:'buy',amount:1000,price:50000}).quantity,.02)
 assert.equal(orderEstimate({kind:'spot',side:'sell',amount:2,price:50000}).notional,100000)
 assert.equal(orderEstimate({kind:'spot',amount:1000,price:0}).quantity,0)
})
test('delivery periods match reference and estimate the selected return',()=>{
 assert.equal(deliveryPeriods.length,8);assert.equal(orderEstimate({kind:'options',amount:100,rate:7}).expected,7)
 assert.equal(deliveryPeriods.at(-1)[0],15*86400)
})
test('stops reject wrong direction and invalid numbers',()=>{
 assert.ok(validStops('buy',100,'110','90'));assert.ok(validStops('sell',100,'90','110'))
 assert.ok(!validStops('buy',100,'90',''));assert.ok(!validStops('sell',100,'110',''))
 assert.ok(!validStops('buy',100,'NaN','90'));assert.ok(!validStops('buy',100,'',''))
})
