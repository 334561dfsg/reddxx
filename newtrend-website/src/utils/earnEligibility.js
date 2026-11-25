import {eligibilityFailures} from '../../../src/shared/lending/eligibility.js'
// Independent public Earn prototype profile; not a real authenticated identity.
export const earnMockProfile=Object.freeze({verificationLevel:'basic',vipLevel:1,simulated:true})
export function earnEligibilityError(product){return eligibilityFailures(product,earnMockProfile)[0]||null}
export function assertEarnEligibility(product){const code=earnEligibilityError(product);if(code)throw new Error(code)}
