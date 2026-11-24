import 'vue'
import { createServer as createHttpServer } from 'node:http'
import test, { before, after } from 'node:test'
import assert from 'node:assert/strict'
import { fileURLToPath } from 'node:url'
import { createServer } from 'vite'
import { loadPacks, validatePacks, validateReferences } from '../scripts/check-locales.mjs'
let server, i18n, account, data
before(async () => {
 globalThis.location = { pathname: '/NewQuantCapital/' }
 const saved = new Map()
 globalThis.localStorage = { getItem: k => saved.get(k) || null, setItem: (k,v) => saved.set(k,v) }
 globalThis.document = { documentElement: { lang: '' } }
 server = await createServer({ root: fileURLToPath(new URL('..', import.meta.url)), server: { middlewareMode: true, hmr: { server: createHttpServer() } }, appType: 'custom' })
 i18n = await server.ssrLoadModule('/src/i18n.js')
 account = await server.ssrLoadModule('/src/account.js')
 data = await server.ssrLoadModule('/src/data.js')
})
after(async () => { await server?.close() })
test('six module-based language packs have identical keys and interpolation parameters', async () => {
 assert.deepEqual(validatePacks(loadPacks()), [])
 assert.deepEqual(validateReferences(loadPacks()), [])
})
test('catalog validator catches missing keys and parameter drift', async () => {
 const packs=loadPacks()
 delete packs['fr-FR']['common.durationDays']
 packs['de-DE']['common.durationDays']='{{wrong}} Tage'
 const errors=validatePacks(packs)
 assert.ok(errors.some(e=>e.includes('fr-FR: missing common.durationDays')))
 assert.ok(errors.some(e=>e.includes('de-DE: parameters differ for common.durationDays')))
})
test('non-default language packs load only when requested', async () => {
 assert.deepEqual(Object.keys(i18n.resources), ['en-US'])
 await i18n.applyLocale('zh-TW')
 assert.ok(i18n.resources['zh-TW'])
 assert.equal(i18n.resources['fr-FR'],undefined)
 assert.equal(i18n.locale.value,'zh-TW')
})
test('fixed keys interpolate days, zero amounts and brand without matching source sentences', async () => {
 await i18n.applyLocale('en-US')
 assert.equal(i18n.t('common.durationDays',{count:12}),'12 days')
 assert.equal(i18n.t('overlay.amountMinimum',{amount:0}),'Enter a valid amount of at least 0.')
 assert.equal(i18n.t('請輸入有效金額'),'請輸入有效金額')
 assert.equal(i18n.t('12 天'),'12 天')
 assert.equal(i18n.t('common.durationDays'),'{{count}} days')
 assert.equal(i18n.t('missing.key'),'missing.key')
 i18n.locale.value='unavailable-locale'
 assert.equal(i18n.t('common.durationDays',{count:2}),'2 days')
 await i18n.applyLocale('en-US')
})
test('parameterized validation messages retranslate without losing their amount', async () => {
 const message={key:'overlay.amountMinimum',params:{amount:'100'}}
 await i18n.applyLocale('en-US');const english=i18n.t(message)
 await i18n.applyLocale('fr-FR');assert.notEqual(i18n.t(message),english);assert.ok(i18n.t(message).includes('100'))
})
test('language switches preserve stable product identifiers and change product names and news content', async () => {
 await i18n.applyLocale('en-US')
 const p=data.products[0],id=p.id,type=p.type,englishName=p.name,englishNews=data.news[0].title
 assert.match(englishName,/180-Day/)
 await i18n.applyLocale('de-DE')
 assert.equal(p.id,id);assert.equal(p.type,type)
 assert.notEqual(p.name,englishName);assert.notEqual(data.news[0].title,englishNews)
 assert.equal(data.path('/news'),'/news')
})
test('six locales provide account titles and synchronize locale preference', async () => {
 const seen=new Set()
 for(const [l] of i18n.languages){await i18n.applyLocale(l);const title=i18n.t('profile.changePassword.title');assert.ok(title&&!title.includes('profile.'));seen.add(title);assert.equal(document.documentElement.lang,l);assert.equal(localStorage.getItem('nt-locale'),l)}
 assert.equal(seen.size,6)
})
test('unknown locale does not replace the selected language', async () => {
 await i18n.applyLocale('de-DE');await i18n.applyLocale('unknown');assert.equal(i18n.locale.value,'de-DE')
})
test('password validation rejects unsupported punctuation, alphabet-only and invalid lengths', async () => {
 for(const value of ['abcdefghi','12345678','Abc123!@','Ab1','A1'.repeat(16)])assert.equal(account.passwordValid(value),false,value)
 for(const value of ['Abc12345','Aa1@#$*.'])assert.equal(account.passwordValid(value),true,value)
})
test('upload validation returns stable message keys independent of current locale', async () => {
 const file={type:'text/html',size:10}
 await i18n.applyLocale('en-US');const key=account.fileError(file),en=i18n.t(key)
 await i18n.applyLocale('fr-FR');assert.equal(account.fileError(file),key);assert.notEqual(i18n.t(key),en)
 assert.ok(account.fileError(null));assert.ok(account.fileError({type:'image/png',size:21*1024*1024},20));assert.equal(account.fileError({type:'image/png',size:500},20),'')
})

test('rapid language switches retain the latest choice',async()=>{
 await Promise.all([i18n.applyLocale('fr-FR'),i18n.applyLocale('de-DE')])
 assert.equal(i18n.locale.value,'de-DE')
 assert.equal(document.documentElement.lang,'de-DE')
})
