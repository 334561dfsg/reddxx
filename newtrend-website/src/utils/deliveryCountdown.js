import {t} from '../i18n'
/** Delivery countdown text: 29秒 under a minute, then mm:ss / hh:mm:ss, with days in front from one day. */
export function deliveryCountdown(seconds){
 if(seconds<60)return t('trade.durationSeconds',{value:seconds})
 const d=Math.floor(seconds/86400),h=Math.floor(seconds%86400/3600),m=Math.floor(seconds%3600/60),s=seconds%60
 const clock=(h||d?[h,m,s]:[m,s]).map(v=>String(v).padStart(2,'0')).join(':')
 return d?`${t('trade.form.days',{value:d})} ${clock}`:clock
}
