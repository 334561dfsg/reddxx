import 'vue'
import {createServer as createHttpServer} from 'node:http'
import test,{before,after} from 'node:test'
import assert from 'node:assert/strict'
import {createServer} from 'vite'
let server,i18n,account
before(async()=>{
 globalThis.location={pathname:'/en-US/'}
 const saved=new Map();globalThis.localStorage={getItem:k=>saved.get(k)||null,setItem:(k,v)=>saved.set(k,v)}
 globalThis.document={documentElement:{lang:''}}
 server=await createServer({server:{middlewareMode:true,hmr:{server:createHttpServer()}},appType:'custom'})
 i18n=await server.ssrLoadModule('/src/i18n.js');account=await server.ssrLoadModule('/src/account.js')
})
after(async()=>{await server?.close()})
test('specific interpolated labels are not swallowed by generic currency patterns',()=>{
 i18n.applyLocale('en-US')
 assert.equal(i18n.tr('距 VIP 1 還需 100,000 USD'),'100,000 USD more to reach VIP 1')
 assert.equal(i18n.tr('滿分 100 · 量化基金申購會參考此分數'),'Out of 100 · Considered for quant fund subscriptions')
 assert.equal(i18n.tr('12 天'),'12 days')
})
test('six locales provide account titles and local validation messages',()=>{
 const seen=new Set()
 for(const [l]of i18n.languages){i18n.applyLocale(l);const title=i18n.t('profile.changePassword.title');assert.ok(title&&!title.includes('profile.'));seen.add(title);assert.ok(i18n.tr('本地演示驗證碼：123456').includes('123456'));assert.equal(document.documentElement.lang,l)}
 assert.equal(seen.size,6)
})
test('unknown locale does not replace the selected language',()=>{i18n.applyLocale('de-DE');i18n.applyLocale('unknown');assert.equal(i18n.locale.value,'de-DE')})
test('password validation rejects unsupported punctuation, alphabet-only and invalid lengths',()=>{
 for(const value of ['abcdefghi','12345678','Abc123!@','Ab1','A1'.repeat(16)])assert.equal(account.passwordValid(value),false,value)
 for(const value of ['Abc12345','Aa1@#$*.'])assert.equal(account.passwordValid(value),true,value)
})
test('upload validation rejects missing, wrong type, and oversized files',()=>{
 assert.ok(account.fileError(null));assert.ok(account.fileError({type:'text/html',size:10}));assert.ok(account.fileError({type:'image/png',size:21*1024*1024},20));assert.equal(account.fileError({type:'image/png',size:500},20),'')
})
