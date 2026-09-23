import test from 'node:test'
import assert from 'node:assert/strict'
import { createStaffRepository } from '../src/features/user-staff/userStaff.js'
const fixture = () => [
  { id:'a1',username:'代理一',role:'agent',status:'active' },
  { id:'a2',username:'代理二',role:'agent',status:'active' },
  { id:'c1',username:'客户一',email:'client@example.com',role:'user',agentParentId:'a1',parentId:'invite-1',registerTime:'2026-09-02T00:00:00Z',kycStatus:'verified' },
  { id:'c2',username:'客户二',role:'user',agentParentId:'a1',registerTime:'2026-08-02T00:00:00Z' }
]
const memory=()=>{let data;return {getItem:()=>data||null,setItem:(_key,value)=>{data=value}}}
const period={startDate:'2026-09-01',endDate:'2026-09-30',agentId:'a1'}
const account=(email='new@example.com')=>({email,isSalesperson:true,phone:'86-13600006666',password:'Example123!'})
const attach=(users,user,agentId='a1')=>{users.find(u=>u.id===user.id).agentParentId=agentId;return user}

test('creates an email-login ordinary user without an agent and retains no plaintext password',async()=>{
 const users=fixture(),storage=memory(),repo=createStaffRepository({users,storage})
 const u=await repo.createUser(account(' New@Example.com '))
 assert.equal(u.role,'user');assert.equal(u.email,'new@example.com');assert.equal(u.username,u.email)
 assert.equal(u.agentParentId,null);assert.equal(u.phone,'8613600006666')
 assert.equal(u.password,undefined)
 assert.equal(storage.getItem('').includes('Example123!'),false)
 assert.equal(u.passwordCredential.algorithm,'PBKDF2-SHA-256')
 attach(users,u);repo.assignEmployee({customerId:'c1',employeeId:u.id})
 const reloaded=fixture();createStaffRepository({users:reloaded,storage})
 assert.equal(reloaded.find(u=>u.id==='c1').employeeId,u.id)
 assert.equal(reloaded.find(u=>u.id==='c1').parentId,'invite-1')
 assert.equal(reloaded.find(r=>r.id===u.id).email,'new@example.com')
})

test('validates email identity, duplicate email, phone format and password before creation',async()=>{
 const users=fixture(),repo=createStaffRepository({users})
 await assert.rejects(repo.createUser({...account(),email:'wrong'}),/邮箱/)
 await assert.rejects(repo.createUser(account('CLIENT@example.com')),/存在/)
 await assert.rejects(repo.createUser({...account(),phone:'abc'}),/手机/)
 await assert.rejects(repo.createUser({...account(),password:'123'}),/密码/)
 assert.equal(users.length,4)
 const u=await repo.createUser({...account(),phone:''});assert.equal(u.phone,'')
 await assert.rejects(repo.createUser(account()),/存在/)
})

test('concurrent duplicate creates commit at most one account',async()=>{
 const users=fixture(),repo=createStaffRepository({users})
 const results=await Promise.allSettled([repo.createUser(account()),repo.createUser(account())])
 assert.equal(results.filter(r=>r.status==='fulfilled').length,1)
 assert.equal(users.filter(r=>r.email==='new@example.com').length,1)
})

test('inherits the agent and rejects self, multi-level and inactive assignments',async()=>{
 const users=fixture(),repo=createStaffRepository({users})
 const u=attach(users,await repo.createUser(account()),'a2')
 repo.assignEmployee({customerId:'c1',employeeId:u.id})
 assert.equal(users.find(c=>c.id==='c1').agentParentId,'a2')
 assert.throws(()=>repo.assignEmployee({customerId:u.id,employeeId:u.id}),/本人/)
 attach(users,u);repo.assignEmployee({customerId:'c1',employeeId:u.id})
 const other=attach(users,await repo.createUser(account('other@example.com')))
 assert.throws(()=>repo.assignEmployee({customerId:u.id,employeeId:other.id}),/已有客户/)
 users.find(u=>u.id==='a1').status='suspended'
 assert.throws(()=>repo.assignEmployee({customerId:'c2',employeeId:other.id}),/代理/)
})

test('transfer updates current counts without reallocating historical performance',async()=>{
 const users=fixture(),repo=createStaffRepository({users})
 const a=attach(users,await repo.createUser(account('a@example.com'))),b=attach(users,await repo.createUser(account('b@example.com')))
 repo.assignEmployee({customerId:'c1',employeeId:a.id})
 repo.recordBusiness({id:'d1',customerId:'c1',date:'2026-09-03',kind:'deposit',amountCents:100001,status:'success'})
 repo.assignEmployee({customerId:'c1',employeeId:b.id})
 repo.recordBusiness({id:'d2',customerId:'c1',date:'2026-09-04',kind:'deposit',amountCents:200002,status:'success'})
 assert.equal(repo.report({...period,employeeId:a.id}).summary.deposit,1000.01)
 assert.equal(repo.report({...period,employeeId:a.id}).summary.currentClients,0)
 assert.equal(repo.report({...period,employeeId:b.id}).summary.deposit,2000.02)
 assert.equal(repo.report({...period,employeeId:b.id}).summary.currentClients,1)
 assert.equal(repo.report(period).summary.deposit,3000.03)
 repo.assignEmployee({customerId:'c1',employeeId:''})
 assert.equal(repo.report({...period,employeeId:'unassigned'}).summary.currentClients,2)
})

test('deduplicates people, excludes failed business and uses lifetime first deposit',()=>{
 const repo=createStaffRepository({users:fixture()})
 for(const row of [{id:'old',date:'2026-08-31',kind:'deposit',amountCents:100},{id:'one',date:'2026-09-03',kind:'deposit',amountCents:101},{id:'two',date:'2026-09-04',kind:'deposit',amountCents:202},{id:'failed',date:'2026-09-04',kind:'deposit',amountCents:900,status:'failed'},{id:'out',date:'2026-09-05',kind:'withdraw',amountCents:100}])repo.recordBusiness({customerId:'c1',status:'success',...row})
 const {summary}=repo.report(period)
 assert.equal(summary.deposit,3.03);assert.equal(summary.depositPeople,1);assert.equal(summary.depositOrders,2);assert.equal(summary.firstPeople,0);assert.equal(summary.net,2.03)
 assert.equal(repo.report({...period,startDate:'2026-09-04',endDate:'2026-09-04'}).summary.deposit,2.02)
 assert.throws(()=>repo.report({...period,startDate:'2026-10-01'}),/日期/)
 assert.throws(()=>repo.report({...period,employeeId:'missing'}),/员工/)
 assert.throws(()=>repo.recordBusiness({id:'one',customerId:'c1',kind:'deposit',date:'2026-09-03',status:'success',amountCents:101}),/重复/)
})

test('storage failure never partially creates a user',async()=>{
 const users=fixture(),repo=createStaffRepository({users,storage:{getItem:()=>null,setItem:()=>{throw Error('quota')}}})
 await assert.rejects(repo.createUser(account()),/保存/);assert.equal(users.length,4)
})

test('historical customer details reconcile after transfer',async()=>{
 const users=fixture(),repo=createStaffRepository({users})
 const e=attach(users,await repo.createUser(account()))
 repo.assignEmployee({customerId:'c1',employeeId:e.id})
 repo.recordBusiness({id:'trade',customerId:'c1',date:'2026-09-05',kind:'spot',amountCents:10000,feeCents:200,commissionCents:50,settledCents:20,status:'success'})
 repo.assignEmployee({customerId:'c1',employeeId:''})
 const all=repo.report(period),historical=repo.report({...period,employeeId:e.id})
 assert.equal(all.summary.trading,100);assert.equal(all.summary.fee,2);assert.equal(all.summary.commission,.5);assert.equal(all.summary.pending,.3)
 assert.equal(historical.rows[0].id,'c1');assert.equal(historical.rows[0].metrics.currentClients,0);assert.equal(historical.rows[0].metrics.commission,.5)
})

test('retires cached seed accounts and assignments without removing manually created users', () => {
 const storage=memory()
 storage.setItem('',JSON.stringify({version:2,initialized:false,employees:[
  {id:'staff_1',username:'演示员工_张明',role:'employee'},
  {id:'user_2007',username:'owner@example.com',email:'owner@example.com',role:'user',createdByAdmin:true}
 ],links:[{id:'c1',agentParentId:'a1',employeeId:'staff_1'}],records:[],registrations:[],audit:[]}))
 const users=fixture(),repo=createStaffRepository({users,storage})
 repo.seedDemo()
 assert.equal(users.some(u=>u.id==='staff_1'),false)
 assert.equal(users.find(u=>u.id==='c1').employeeId,null)
 assert.equal(users.some(u=>u.id==='user_2007'),true)
 assert.equal(JSON.parse(storage.getItem('')).employees.length,1)
 const restored=fixture();createStaffRepository({users:restored,storage}).seedDemo()
 assert.equal(restored.filter(u=>u.createdByAdmin).length,1)
})

test('optional salesperson identity and agent assignment persist together', async () => {
 const users=fixture(),storage=memory(),repo=createStaffRepository({users,storage})
 const ordinary=await repo.createUser({...account('ordinary@example.com'),isSalesperson:false,agentParentId:'a1'})
 assert.equal(ordinary.isSalesperson,false);assert.equal(ordinary.agentParentId,null)
 const unassigned=await repo.createUser(account('unassigned@example.com'))
 assert.equal(unassigned.isSalesperson,true);assert.equal(unassigned.agentParentId,null)
 const assigned=await repo.createUser({...account('assigned@example.com'),agentParentId:'a1'})
 assert.equal(assigned.agentParentId,'a1');assert.equal(assigned.agentParentUsername,'代理一')
 assert.deepEqual(repo.employees('a1').map(u=>u.id),[assigned.id])
 await assert.rejects(repo.createUser({...account('invalid@example.com'),agentParentId:'c1'}),/有效且活跃/)
 assert.equal(users.some(u=>u.email==='invalid@example.com'),false)
 const restored=fixture();const reload=createStaffRepository({users:restored,storage})
 assert.equal(restored.find(u=>u.id===assigned.id).isSalesperson,true)
 assert.equal(reload.employees().length,2)
})

test('persists salesperson identity changes for existing users', () => {
 const users=fixture(),storage=memory(),repo=createStaffRepository({users,storage})
 repo.persistUserUpdate('c1',{isSalesperson:true})
 let restored=fixture();let reloaded=createStaffRepository({users:restored,storage})
 assert.equal(restored.find(u=>u.id==='c1').isSalesperson,true)
 assert.equal(reloaded.employees('a1')[0].id,'c1')
 reloaded.persistUserUpdate('c1',{isSalesperson:false})
 restored=fixture();reloaded=createStaffRepository({users:restored,storage})
 assert.equal(restored.find(u=>u.id==='c1').isSalesperson,false)
 assert.equal(reloaded.employees('a1').length,0)
})

test('cross-agent reassignment preserves history, persists both links and retains agent on unlink', async () => {
 const users=fixture(),storage=memory(),repo=createStaffRepository({users,storage})
 const a=await repo.createUser({...account('first@example.com'),agentParentId:'a1'})
 const b=await repo.createUser({...account('second@example.com'),agentParentId:'a2'})
 users.find(u=>u.id==='c1').agentParentId=null
 repo.assignEmployee({customerId:'c1',employeeId:a.id})
 repo.recordBusiness({id:'before-transfer',customerId:'c1',date:'2026-09-03',kind:'deposit',amountCents:10000,status:'success'})
 repo.assignEmployee({customerId:'c1',employeeId:b.id})
 assert.equal(users.find(u=>u.id==='c1').agentParentUsername,'代理二')
 assert.equal(users.find(u=>u.id==='c1').parentId,'invite-1')
 assert.equal(repo.report(period).summary.deposit,100)
 assert.equal(repo.report({...period,agentId:'a2'}).summary.deposit,0)
 const restored=fixture();createStaffRepository({users:restored,storage})
 assert.equal(restored.find(u=>u.id==='c1').employeeId,b.id)
 assert.equal(restored.find(u=>u.id==='c1').agentParentId,'a2')
 repo.assignEmployee({customerId:'c1',employeeId:''})
 assert.equal(users.find(u=>u.id==='c1').agentParentId,'a2')
 assert.equal(users.find(u=>u.id==='c1').employeeId,null)
 const unassigned=await repo.createUser(account('noagent@example.com'))
 assert.throws(()=>repo.assignEmployee({customerId:'c1',employeeId:unassigned.id}),/尚未设置所属代理/)
 assert.equal(users.find(u=>u.id==='c1').agentParentId,'a2')
})
