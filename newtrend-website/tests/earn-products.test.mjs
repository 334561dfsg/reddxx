import test from 'node:test'
import assert from 'node:assert/strict'
import {earnTerms,subscriptionError,maximumSubscription,quotaPercent} from '../src/utils/earnProducts.js'
const fixed={...earnTerms.usdt90,min:500,remaining:'7,900,000'}
test('product limits and balance protect subscription amounts independently',()=>{
 for(const raw of ['',0,-1,'no',Infinity])assert.equal(subscriptionError(fixed,raw,100000).code,'invalidAmount')
 assert.equal(subscriptionError(fixed,499,100000).code,'minAmount')
 assert.equal(subscriptionError(fixed,1000001,2000000).code,'maxAmount')
 assert.equal(subscriptionError(fixed,200001,2000000).code,'perUserQuota')
 assert.equal(subscriptionError(fixed,500,0).code,'insufficientBalance')
 assert.equal(subscriptionError(fixed,500,1000),null)
 assert.equal(subscriptionError({...fixed,remaining:'600'},700,1000).code,'availableQuota')
})
test('maximum respects balance, product, remaining and individual limits',()=>{
 assert.equal(maximumSubscription(fixed,0),0)
 assert.equal(maximumSubscription(fixed,1000000),200000)
 assert.equal(maximumSubscription({...fixed,remaining:'600'},1000),600)
 const btc={...earnTerms.btc60,min:.01,remaining:'965.6'}
 assert.equal(maximumSubscription(btc,1000),100)
 assert.equal(subscriptionError(btc,.01,1),null)
})
test('quota and APY preserve reference values instead of rounded-rate extrapolation',()=>{
 assert.equal(quotaPercent(fixed),1.3)
 assert.equal(earnTerms.usdt90.apy,8.49)
 assert.equal(earnTerms.usdt180.apy,9.99)
 assert.equal(Object.keys(earnTerms).length,8)
})
