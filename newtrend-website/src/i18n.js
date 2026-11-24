import { ref } from 'vue'

export const languages = [
  ['en-US', 'English'], ['zh-TW', '繁體中文'], ['fr-FR', 'Français'],
  ['de-DE', 'Deutsch'], ['ja-JP', '日本語'], ['ko-KR', '한국어'],
]
export const DEFAULT_LOCALE = 'en-US'
export const BRAND_NAME = 'NewQuantCapital'
const modules = import.meta.glob('./locales/*/*.json', { import: 'default' })
const fallbackModules = import.meta.glob('./locales/en-US/*.json', { eager:true, import:'default' })
export const resources = { 'en-US':Object.fromEntries(Object.entries(fallbackModules).map(([file,data])=>[file.split('/').pop().replace('.json',''),data])) }
const loading = new Map()
async function loadLocale(language){
 if(resources[language])return
 if(!loading.has(language))loading.set(language,Promise.all(Object.entries(modules).filter(([file])=>file.includes('/'+language+'/')).map(async([file,load])=>[file.split('/').pop().replace('.json',''),await load()])).then(entries=>{
  resources[language]=Object.fromEntries(entries)
  messages[language]=flatten(resources[language])
 }).catch(error=>{loading.delete(language);throw error}))
 await loading.get(language)
}
function flatten(object, prefix = '', result = {}) {
  for (const [name, value] of Object.entries(object)) {
    const key = prefix ? `${prefix}.${name}` : name
    if (typeof value === 'string') result[key] = value
    else if (value && typeof value === 'object') flatten(value, key, result)
  }
  return result
}
const messages = Object.fromEntries(Object.entries(resources).map(([language, data]) => [language, flatten(data)]))
const storedLocale = localStorage.getItem('nt-locale')
export const locale = ref(languages.some(([code])=>code===storedLocale) ? storedLocale : 'zh-TW')

/** Keys are resolved directly. Raw API/user values are returned unchanged, never reverse-translated. */
export function t(key, params = {}) {
  if (key && typeof key === 'object' && typeof key.key === 'string') return t(key.key, key.params)
  if (typeof key !== 'string') return key
  const message = messages[locale.value]?.[key] ?? messages[DEFAULT_LOCALE]?.[key]
  if (message === undefined) return key
  const values = { brand: BRAND_NAME, brandName: BRAND_NAME, ...params }
  return message.replace(/\{\{\s*([^}]+?)\s*\}\}/g, (placeholder, name) =>
    values[name] === undefined || values[name] === null ? placeholder : String(values[name]))
}
let languageRequest=0
export async function applyLocale(language) {
 if (!languages.some(([code])=>code===language)) return
 const request=++languageRequest
 await loadLocale(language)
 if(request!==languageRequest)return
 locale.value = language
 localStorage.setItem('nt-locale', language)
 document.documentElement.lang = language
}
export function formatCompact(value) {
  if (typeof value !== 'number') return value
  return new Intl.NumberFormat(locale.value, { notation: 'compact', maximumFractionDigits: 2 }).format(value)
}
