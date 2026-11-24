import fs from 'node:fs'
import path from 'node:path'
import {fileURLToPath} from 'node:url'
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../src/locales')
export const supportedLocales=['en-US','zh-TW','fr-FR','de-DE','ja-JP','ko-KR']
export function flattenMessages(value,prefix='',out={}) {
 for(const [name,message] of Object.entries(value)) {
  const key=prefix?`${prefix}.${name}`:name
  if(typeof message==='string')out[key]=message
  else if(message&&typeof message==='object')flattenMessages(message,key,out)
  else throw new Error(`Invalid language message: ${key}`)
 }
 return out
}
export function loadPacks(){return Object.fromEntries(supportedLocales.map(locale=>{
 const modules={};for(const name of fs.readdirSync(path.join(root,locale)).filter(n=>n.endsWith('.json')))modules[name.slice(0,-5)]=JSON.parse(fs.readFileSync(path.join(root,locale,name),'utf8'))
 return [locale,flattenMessages(modules)]
}))}
export function validatePacks(packs){
 const errors=[],keys=new Set(Object.values(packs).flatMap(p=>Object.keys(p)))
 const params=value=>[...value.matchAll(/\{\{\s*([^}]+?)\s*\}\}/g)].map(m=>m[1]).filter((v,i,a)=>a.indexOf(v)===i).sort().join(',')
 for(const key of keys)for(const locale of supportedLocales){
  if(!(key in packs[locale]))errors.push(`${locale}: missing ${key}`)
  else if(params(packs[locale][key])!==params(packs['en-US'][key]||''))errors.push(`${locale}: parameters differ for ${key}`)
 }
 return errors
}
export function validateReferences(packs) {
 const sourceRoot=path.dirname(root),errors=[]
 const namespaces=[...new Set(Object.keys(packs['en-US']).map(key=>key.split('.')[0]))]
 const keyPattern=new RegExp(`(?<!=)["']((?:${namespaces.join('|')})\\.[\\w.]+)["']`,'g')
 const visit=dir=>fs.readdirSync(dir,{withFileTypes:true}).flatMap(entry=>entry.isDirectory()?visit(path.join(dir,entry.name)):[path.join(dir,entry.name)])
 for(const file of visit(sourceRoot).filter(file=>/\.(vue|js)$/.test(file))) {
  const code=fs.readFileSync(file,'utf8').replaceAll('&quot;','"')
  if(/\$tr\s*\(/.test(code))errors.push(`${file}: obsolete source-text translation call`)
  for(const [,key] of code.matchAll(keyPattern)) {
   if(!key.endsWith('.')&&!(key in packs['en-US']))errors.push(`${path.relative(sourceRoot,file)}: unknown ${key}`)
  }
 }
 return [...new Set(errors)]
}
if(process.argv[1]===fileURLToPath(import.meta.url)){
 const packs=loadPacks(),errors=[...validatePacks(packs),...validateReferences(packs)]
 if(errors.length){console.error(errors.join('\n'));process.exitCode=1}
 else console.log(`Language packs valid: ${supportedLocales.length} locales, ${Object.keys(packs['en-US']).length} keys each`)
}
