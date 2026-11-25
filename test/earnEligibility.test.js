import test from 'node:test'
import assert from 'node:assert/strict'
import {assertEarnEligibility,earnEligibilityError,earnMockProfile} from '../newtrend-website/src/utils/earnEligibility.js'
test('Earn gates use the prototype profile and require both minimum levels',()=>{
 assert.equal(Object.isFrozen(earnMockProfile),true)
 assert.equal(earnEligibilityError({}),null)
 assert.equal(earnEligibilityError({minVerificationLevel:'basic',minVipLevel:1}),null)
 assert.throws(()=>assertEarnEligibility({minVerificationLevel:'advanced',minVipLevel:1}),/verificationRequired/)
 assert.throws(()=>assertEarnEligibility({minVerificationLevel:'basic',minVipLevel:2}),/vipRequired/)
})
