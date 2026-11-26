import {shallowRef} from 'vue'
import {message} from 'ant-design-vue'
import {applyLocale,t} from '../i18n'

// One language-switch flow for the header menu, the mobile menu overlay and account settings:
// ignores repeat clicks while a pack loads and reports a failed load with a toast (site feedback rule).
export function useLocaleSwitch(){
 const busy=shallowRef(false)
 async function switchTo(code){
  if(busy.value)return false
  busy.value=true
  try{await applyLocale(code);return true}
  catch{message.error(t('customerService.errors.loadFailed'));return false}
  finally{busy.value=false}
 }
 return {busy,switchTo}
}
