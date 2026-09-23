import test from 'node:test'
import assert from 'node:assert/strict'
import { createSalespersonMfa, salespersonDelivery } from '../src/features/user-staff/userMfa.js'
import { createStaffRepository } from '../src/features/user-staff/userStaff.js'

test('salesperson setup generates unique local QR codes with matching TOTP identity', async () => {
 const a=await createSalespersonMfa('sales@example.com'),b=await createSalespersonMfa('sales@example.com')
 assert.match(a.secret,/^[A-Z2-7]{32}$/)
 assert.notEqual(a.secret,b.secret)
 const uri=new URL(a.otpauthUrl)
 assert.equal(uri.searchParams.get('secret'),a.secret)
 assert.equal(uri.searchParams.get('issuer'),'FEX Sales')
 assert.equal(a.status,'pending')
 assert.match(a.qrCodeUrl,/^data:image\/svg\+xml/)
 assert.match(decodeURIComponent(a.qrCodeUrl.split(',')[1]),/<svg/)
 const delivery=salespersonDelivery(a.accountName,'Example123!',a)
 assert.ok(delivery.message.includes(a.secret))
 assert.ok(delivery.message.includes('sales@example.com'))
})

test('only salesperson creation stores MFA setup and audit does not disclose credentials', async () => {
 let saved;const users=[]
 const repo=createStaffRepository({users,storage:{getItem:()=>saved,setItem:(_key,value)=>{saved=value}}})
 const ordinary=await repo.createUser({email:'ordinary@example.com',password:'Example123!'})
 assert.equal(ordinary.mfaSetup,undefined)
 const salesperson=await repo.createUser({email:'sales@example.com',password:'Example123!',isSalesperson:true})
 assert.equal(salesperson.mfaSetup.status,'pending')
 assert.equal(JSON.stringify(repo.getAudit()).includes(salesperson.mfaSetup.secret),false)
 assert.equal(saved.includes('Example123!'),false)
 const restored=[];createStaffRepository({users:restored,storage:{getItem:()=>saved}})
 assert.equal(restored.find(u=>u.id===salesperson.id).mfaSetup.secret,salesperson.mfaSetup.secret)
})

test('MFA setup on an existing user survives refresh without changing password credentials', async () => {
 let saved
 const users=[{id:'existing',role:'user',username:'existing@example.com',email:'existing@example.com',passwordCredential:{hash:'existing-hash'}}]
 const repo=createStaffRepository({users,storage:{getItem:()=>saved,setItem:(_key,value)=>{saved=value}}})
 const setup=await createSalespersonMfa(users[0].email)
 repo.persistUserUpdate('existing',{isSalesperson:true,mfaSetup:setup})
 const restored=[{...users[0]}]
 createStaffRepository({users:restored,storage:{getItem:()=>saved}})
 assert.equal(restored[0].mfaSetup.secret,setup.secret)
 assert.equal(restored[0].passwordCredential.hash,'existing-hash')
})
