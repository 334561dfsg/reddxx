import {VERIFICATION_LEVEL_OPTIONS} from '../../constants/verification.js'
import {vipLevels} from '../../admin/mock/vip.js'
export const verificationOptions=[{value:'none',label:'不限制'},...VERIFICATION_LEVEL_OPTIONS.filter(o=>o.value!=='none')]
export const vipOptions=[{value:0,label:'不限制'},...vipLevels.filter(v=>v.level>0).map(v=>({value:v.level,label:`VIP${v.level} · ${v.displayName}`}))]
const ranks={none:0,basic:1,advanced:2}
export function validateEligibility(p){
 if(!verificationOptions.some(o=>o.value===p.minVerificationLevel)||!vipOptions.some(o=>o.value===p.minVipLevel))throw new Error('eligibilityConfig')
}
export function eligibilityFailures(p,profile){
 if(!p)return []
 const failures=[]
 if((ranks[profile?.verificationLevel]??0)<(ranks[p.minVerificationLevel]??0))failures.push('verificationRequired')
 if((profile?.vipLevel??0)<(p.minVipLevel??0))failures.push('vipRequired')
 return failures
}
