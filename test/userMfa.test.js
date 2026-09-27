import test from 'node:test'
import assert from 'node:assert/strict'
import { salespersonDelivery } from '../src/features/user-staff/credentialDelivery.js'
import { createStaffRepository } from '../src/features/user-staff/userStaff.js'

test('salesperson delivery contains only account and password', () => {
 const delivery=salespersonDelivery('sales@example.com','Example123!')
 assert.deepEqual(delivery,{email:'sales@example.com',password:'Example123!',message:'账号：sales@example.com\n密码：Example123!'})
 assert.doesNotMatch(JSON.stringify(delivery),/MFA|mfaSetup|二维码|密钥/)
})

test('creating a salesperson no longer generates MFA setup and still protects password storage', async () => {
 let saved;const users=[]
 const repo=createStaffRepository({users,storage:{getItem:()=>saved,setItem:(_key,value)=>{saved=value}}})
 const salesperson=await repo.createUser({email:'sales@example.com',password:'Example123!',isSalesperson:true})
 assert.equal(salesperson.isSalesperson,true)
 assert.equal(salesperson.mfaSetup,undefined)
 assert.equal(saved.includes('Example123!'),false)
 assert.equal(JSON.stringify(repo.getAudit()).includes('Example123!'),false)
 const restored=[];createStaffRepository({users:restored,storage:{getItem:()=>saved}})
 assert.equal(restored.find(u=>u.id===salesperson.id).mfaSetup,undefined)
})

test('MFA setup on an existing user survives refresh without changing password credentials', async () => {
 let saved
 const users=[{id:'existing',role:'user',username:'existing@example.com',email:'existing@example.com',passwordCredential:{hash:'existing-hash'}}]
 const repo=createStaffRepository({users,storage:{getItem:()=>saved,setItem:(_key,value)=>{saved=value}}})
 const setup={secret:'legacy-secret',status:'pending'}
 repo.persistUserUpdate('existing',{isSalesperson:true,mfaSetup:setup})
 const restored=[{...users[0]}]
 createStaffRepository({users:restored,storage:{getItem:()=>saved}})
 assert.equal(restored[0].mfaSetup.secret,setup.secret)
 assert.equal(restored[0].passwordCredential.hash,'existing-hash')
})
