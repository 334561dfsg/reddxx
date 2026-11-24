import {ref} from 'vue'
import extras from './locale-extras.json'
import charityLocales from './charity-locales.json'
import aliases from './locale-aliases.json'
import newsLocales from './news-locales.json'
import zh from './locales/zh-TW.json'
import en from './locales/en-US.json'
import fr from './locales/fr-FR.json'
import de from './locales/de-DE.json'
import ja from './locales/ja-JP.json'
import ko from './locales/ko-KR.json'
export const languages=[['en-US','English'],['zh-TW','繁體中文'],['fr-FR','Français'],['de-DE','Deutsch'],['ja-JP','日本語'],['ko-KR','한국어']]
export const resources={'zh-TW':zh,'en-US':en,'fr-FR':fr,'de-DE':de,'ja-JP':ja,'ko-KR':ko}
export const locale=ref(resources[location.pathname.replace(/^\/newtrend(?=\/|$)/,'').split('/')[1]]?location.pathname.replace(/^\/newtrend(?=\/|$)/,'').split('/')[1]:localStorage.getItem('nt-locale')||'zh-TW')
if(!resources[locale.value])locale.value='zh-TW'
const flat={};function flatten(obj,p='',out={}){for(const[k,v]of Object.entries(obj)){const key=p?p+'.'+k:k;if(typeof v==='string')out[key]=v;else if(v&&typeof v==='object')flatten(v,key,out)}return out}
for(const [l,data]of Object.entries(resources))flat[l]=flatten(data)
const normalize=s=>s.trim().replace(/\s+/g,' ').replace(/[，、]/g,',').replace(/\s*—+\s*/g,'—')
const reverse=new Map();for(const l of ['en-US','zh-TW'])for(const[k,v]of Object.entries(flat[l]))if(!reverse.has(normalize(v)))reverse.set(normalize(v),k)
for(const [label,key]of Object.entries(aliases))if(flat['en-US'][key])reverse.set(normalize(label),key)
const patterns=Object.entries(flat['zh-TW']).filter(([,v])=>v.includes('{{')&&/[\p{L}]/u.test(v.replace(/\{\{.*?\}\}/g,''))).sort((a,b)=>b[1].replace(/\{\{.*?\}\}/g,'').length-a[1].replace(/\{\{.*?\}\}/g,'').length).map(([key,v])=>{const names=[];let last=0,pattern='';for(const m of v.matchAll(/\{\{\s*([^}]+?)\s*\}\}/g)){pattern+=v.slice(last,m.index).replace(/[.*+?^${}()|[\]\\]/g,'\\$&')+'(.+?)';names.push(m[1]);last=m.index+m[0].length}pattern+=v.slice(last).replace(/[.*+?^${}()|[\]\\]/g,'\\$&');return{key,names,re:new RegExp('^'+pattern+'$')}})
export function t(key,params={}){let value=flat[locale.value]?.[key]??flat['en-US'][key]??key;return value.replace(/\{\{\s*([^}]+?)\s*\}\}/g,(_,k)=>params[k]??({brand:'NewQuantCapital',brandName:'NewQuantCapital'}[k]||''))}
export function tr(value){if(typeof value!=='string'||!value.trim())return value;if(locale.value!=='zh-TW'){const extra=extras[value.trim()]?.[locale.value];if(extra)return extra;const vol=value.match(/^([\d,.]+)(億|萬)$/);if(vol){const amount=Number(vol[1].replace(/,/g,''))*(vol[2]==='億'?1e8:1e4);return new Intl.NumberFormat(locale.value,{notation:'compact',maximumFractionDigits:2}).format(amount)}const days=value.match(/^(\d+) 天$/);if(days)return days[1]+extras['天'][locale.value];}
const charityIndex=charityLocales['zh-TW'].indexOf(value.trim());if(charityIndex>=0)return charityLocales[locale.value]?.[charityIndex]||value;
const sourceNews=newsLocales['zh-TW'].find(n=>n.title===value||n.summary===value);if(sourceNews){const target=newsLocales[locale.value]?.find(n=>n.image===sourceNews.image);if(target)return sourceNews.title===value?target.title:target.summary}
const key=reverse.get(normalize(value));if(key)return t(key);if(locale.value==='zh-TW')return value;for(const p of patterns){const m=value.trim().match(p.re);if(m)return t(p.key,Object.fromEntries(p.names.map((n,i)=>[n,m[i+1]])))}return value}
export function applyLocale(l){if(!resources[l])return;locale.value=l;localStorage.setItem('nt-locale',l);document.documentElement.lang=l}
