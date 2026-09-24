import test from 'node:test'
import assert from 'node:assert/strict'
import { createPinia, setActivePinia } from 'pinia'
import * as nav from '../src/constants/agentSystemNav.js'
import { createStaffRepository } from '../src/features/user-staff/userStaff.js'
import { usersList } from '../src/admin/mock/user.js'
import { useAgentAuthStore } from '../src/stores/agentAuth.js'

const fixture = () => [
  { id:'a1', role:'agent', status:'active', username:'Agent' },
  { id:'a2', role:'agent', status:'active', username:'Other' },
  { id:'s1', role:'user', isSalesperson:true, agentParentId:'a1', status:'active' },
  { id:'s2', role:'user', isSalesperson:true, agentParentId:'a1', status:'active' },
  { id:'s3', role:'user', isSalesperson:true, agentParentId:'a2', status:'active' },
  { id:'c1', role:'user', agentParentId:'a1', employeeId:'s1', registerTime:'2026-09-01' },
  { id:'c2', role:'user', agentParentId:'a1', employeeId:'s2', registerTime:'2026-09-01' },
  { id:'c3', role:'user', agentParentId:'a2', employeeId:'s3', registerTime:'2026-09-01' }
]

test('salesperson navigation and direct access share the five-page allowlist', () => {
  assert.deepEqual(nav.getAgentSystemNav('salesperson').map(x=>x.key), ['dashboard','data','dailyReport','verification','settings'])
  assert.equal(nav.canAccessAgentSystemPath('salesperson','/agent-system/team'), false)
  assert.equal(nav.canAccessAgentSystemPath('salesperson','/agent-system/commission/'), false)
  assert.equal(nav.canAccessAgentSystemPath('salesperson','/agent-system/settings?tab=password'), true)
  assert.equal(nav.canAccessAgentSystemPath('agent','/agent-system/team'), true)
  assert.deepEqual(nav.getAgentSystemNav(null), [])
})

test('daily reports filter before aggregation and retain historical salesperson ownership', () => {
  const users=fixture(), repo=createStaffRepository({users})
  for (const [id,customerId,amountCents,commissionCents] of [['1','c1',10000,125],['2','c2',20000,250],['3','c3',90000,900]]) {
    repo.recordBusiness({id,customerId,amountCents,commissionCents,date:'2026-09-02',kind:'spot',status:'success'})
  }
  repo.recordBusiness({id:'failed',customerId:'c1',amountCents:90000,date:'2026-09-02',kind:'spot',status:'failed'})
  const all=repo.dailyReport({agentId:'a1'})
  assert.equal(all.find(r=>r.date==='2026-09-02').tradeVolume,300)
  assert.equal(all.find(r=>r.date==='2026-09-01').newInvites,2)
  const selected=repo.dailyReport({agentId:'a1',employeeId:'s1'})
  assert.equal(selected.find(r=>r.date==='2026-09-02').tradeVolume,100)
  assert.equal(selected.find(r=>r.date==='2026-09-02').commissionByModule.spot,1.25)
  repo.assignEmployee({customerId:'c1',employeeId:'s2'})
  assert.equal(repo.dailyReport({agentId:'a1',employeeId:'s1'}).find(r=>r.date==='2026-09-02').tradeVolume,100)
  assert.throws(()=>repo.dailyReport({agentId:'a1',employeeId:'s3'}))
  assert.throws(()=>repo.dailyReport({agentId:'',employeeId:'s1'}))
})

test('salesperson login verifies created password, preserves role on reload, and supports password changes', async () => {
  const data=new Map()
  globalThis.localStorage={getItem:k=>data.get(k)||null,setItem:(k,v)=>data.set(k,v),removeItem:k=>data.delete(k)}
  const repo=createStaffRepository({users:usersList})
  const person=await repo.createUser({email:'portal-sales-test@example.com',password:'Sales!12345',isSalesperson:true,agentParentId:'user_1001'})
  // Verify the authenticator challenge first, then isolate password/session behavior.
  const row=usersList.find(u=>u.id===person.id)
  try {
    setActivePinia(createPinia())
    const challenge=await useAgentAuthStore().login(person.email,'Sales!12345')
    assert.equal(challenge.ok,false)
    assert.equal(challenge.requiresMfa,true)
    delete row.mfaSetup
    setActivePinia(createPinia())
    let auth=useAgentAuthStore()
    assert.equal((await auth.login(person.email,'wrong123')).ok,false)
    assert.equal((await auth.login(person.email,'Sales!12345')).ok,true)
    assert.equal(auth.role,'salesperson')
    assert.equal(auth.userId,person.id)
    assert.equal(auth.agentId,'user_1001')
    assert.equal(auth.inviteCode,null)
    // A stale or forged session role must not promote the account.
    const saved=JSON.parse(data.get('fex-agent-session-v1'));saved.role='agent';data.set('fex-agent-session-v1',JSON.stringify(saved))
    setActivePinia(createPinia());auth=useAgentAuthStore();auth.ensureHydrated()
    assert.equal(auth.role,'salesperson')
    assert.equal((await auth.changePassword({oldPassword:'Sales!12345',newPassword:'Sales!54321',confirmPassword:'Sales!54321'})).ok,true)
    auth.logout()
    assert.equal(auth.role,null)
    assert.equal((await auth.login(person.email,'Sales!12345')).ok,false)
    assert.equal((await auth.login(person.email,'Sales!54321')).ok,true)
    row.status='banned'
    setActivePinia(createPinia());auth=useAgentAuthStore();auth.ensureHydrated()
    assert.equal(auth.isLoggedIn,false)
    assert.equal((await auth.login(person.email,'Sales!54321')).ok,false)
  } finally {
    usersList.splice(usersList.findIndex(u=>u.id===person.id),1)
    delete globalThis.localStorage
  }
})

// RFC 6238 SHA-1 test vector, truncated to the issued six-digit format.
test('salesperson authenticator rejects arbitrary six-digit codes', async () => {
  const { verifyStaffTotp } = await import('../src/features/user-staff/verifyCredential.js')
  const secret='GEZDGNBVGY3TQOJQGEZDGNBVGY3TQOJQ'
  assert.equal(await verifyStaffTotp(secret,'287082',59000),true)
  assert.equal(await verifyStaffTotp(secret,'123456',59000),false)
  assert.equal(await verifyStaffTotp(secret,'287082',180000),false)
  assert.equal(await verifyStaffTotp('', '287082',59000),false)
})

test('existing Zhao agent resolves the same identity used by staff assignment', () => {
  setActivePinia(createPinia())
  const auth=useAgentAuthStore()
  assert.equal(auth.login('zhao@example.com','Agent123456').ok,true)
  assert.equal(auth.agentId,'user_1009')
})

test('report scope forces salesperson identity and rejects a foreign agent filter', async () => {
  const { effectScope, nextTick } = await import('vue')
  const { getUserStaffRepository } = await import('../src/admin/repositories/userStaffRepository.js')
  const { useAgentReportScope } = await import('../src/composables/useAgentReportScope.js')
  const added=[
    {id:'scope-sales-a',role:'user',isSalesperson:true,status:'active',agentParentId:'user_1001',username:'A'},
    {id:'scope-sales-b',role:'user',isSalesperson:true,status:'active',agentParentId:'user_1001',username:'B'},
    {id:'scope-sales-other',role:'user',isSalesperson:true,status:'active',agentParentId:'user_1009',username:'Other'},
    {id:'scope-client-a',role:'user',agentParentId:'user_1001',employeeId:'scope-sales-a'},
    {id:'scope-client-b',role:'user',agentParentId:'user_1001',employeeId:'scope-sales-b'}
  ]
  usersList.push(...added)
  const scope=effectScope()
  try {
    const repo=getUserStaffRepository()
    repo.recordBusiness({id:'scope-record-a',customerId:'scope-client-a',date:'2026-09-24',kind:'spot',status:'success',amountCents:10000})
    repo.recordBusiness({id:'scope-record-b',customerId:'scope-client-b',date:'2026-09-24',kind:'spot',status:'success',amountCents:20000})
    setActivePinia(createPinia())
    const auth=useAgentAuthStore()
    auth.$patch({role:'agent',userId:'user_1001',agentId:'user_1001'})
    const report=scope.run(()=>useAgentReportScope())
    report.employeeFilter.value='scope-sales-b'
    assert.equal(report.dailyRows.value[0].tradeVolume,200)
    report.employeeFilter.value='scope-sales-other'
    assert.equal(report.dailyRows.value.length,0)
    assert.ok(report.reportError.value)
    auth.$patch({role:'salesperson',userId:'scope-sales-a'})
    await nextTick()
    assert.equal(report.employeeFilter.value,'')
    report.employeeFilter.value='scope-sales-b'
    assert.deepEqual(report.employeeOptions.value,[])
    assert.equal(report.dailyRows.value[0].tradeVolume,100)
  } finally {
    scope.stop()
    for(const user of added) usersList.splice(usersList.indexOf(user),1)
  }
})

test('verification scope is applied before pagination and unknown roles fail closed', async () => {
 const {portalClientIds}=await import('../src/features/user-staff/portalScope.js')
 const {getVerificationAudits,verificationAuditList}=await import('../src/admin/mock/verification.js')
 const users=fixture()
 assert.deepEqual(portalClientIds({role:'salesperson',userId:'s1',agentId:'a1'},users),['c1'])
 assert.deepEqual(portalClientIds({role:'agent',userId:'a1',agentId:'a1'},users),['c1','c2'])
 assert.deepEqual(portalClientIds({role:'salesperson',userId:'s1'},users),[])
 const target=verificationAuditList[0]
 const result=await getVerificationAudits({page:1,pageSize:1,allowedUserIds:[target.userId]})
 assert.ok(result.list.every(row=>row.userId===target.userId))
 assert.equal(result.total,verificationAuditList.filter(row=>row.userId===target.userId).length)
 assert.equal((await getVerificationAudits({page:1,pageSize:10,allowedUserIds:[]})).total,0)
})

test('prototype demo login defaults on and switches only between the fixed demo identities', async () => {
 const {AGENT_DEMO_LOGIN_ENABLED}=await import('../src/stores/agentAuth.js')
 assert.equal(AGENT_DEMO_LOGIN_ENABLED,true)
 setActivePinia(createPinia())
 const auth=useAgentAuthStore()
 assert.equal(auth.loginDemo('agent').ok,true)
 assert.equal(auth.role,'agent')
 assert.equal(auth.userId,'user_1001')
 assert.equal(auth.loginDemo('salesperson').ok,true)
 assert.equal(auth.role,'salesperson')
 assert.equal(auth.userId,'user_900001')
 auth.logout()
 assert.equal(auth.loginDemo('admin').ok,false)
 assert.equal(auth.isLoggedIn,false)
})
