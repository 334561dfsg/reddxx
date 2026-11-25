import test from 'node:test'
import assert from 'node:assert/strict'
import {c2cQuotes,quoteAmount,formatQuote} from '../src/utils/c2cQuotes.js'
test('C2C quantity and notional modes enforce the same limits',()=>{
 for(const quote of c2cQuotes){
  assert.equal(quoteAmount(quote,quote.min).error,null)
  assert.equal(quoteAmount(quote,quote.max).error,null)
  assert.equal(quoteAmount(quote,quote.min/2).error.key,'c2c.order.amountTooSmall')
  assert.equal(quoteAmount(quote,quote.max*2).error.key,'c2c.order.amountTooLarge')
  const value=quoteAmount(quote,(quote.min+1)*quote.price,'fiat')
  assert.equal(value.error,null)
  assert.ok(Math.abs(value.quantity-(quote.min+1))<1e-8)
 }
})
test('C2C invalid input never becomes a valid order',()=>{
 for(const input of ['',0,-1,'abc',Infinity]) assert.ok(quoteAmount(c2cQuotes[0],input).error)
})
test('C2C quote formatting preserves sub-cent precision',()=>{
 assert.equal(formatQuote(1.0110605),'1.0110605')
 assert.equal(formatQuote(59125.3394),'59,125.3394')
})
