import {onUnmounted,reactive,ref} from 'vue'
import {message} from 'ant-design-vue'
import {t} from '../../i18n'
import {fileError} from '../../account'

// Shared helpers for the account sub-pages. Feedback is a toast per attempt (site rule), so repeated
// failures re-announce. Each sub-page owns its own draft state; the shell remounts it per route.
export const notifyError=key=>message.error(t(key))
export const notifySuccess=key=>message.success(t(key))

/** Copies to the clipboard with a toast per attempt. */
export function copyText(value){
 navigator.clipboard.writeText(value).then(()=>notifySuccess('common.copied')).catch(()=>notifyError('common.copyFailed'))
}

/** Local file pickers: keeps only the file name of valid picks (≤20MB images/PDF), toasts invalid ones. */
export function useUploads(){
 const files=reactive({})
 function selectFile(key,event){
  const file=event.target.files?.[0],problem=fileError(file,20)
  if(problem){delete files[key];notifyError(problem)}else files[key]=file.name
 }
 return {files,selectFile}
}

/** 60s resend countdown for demo verification codes; cleared on unmount. */
export function useCodeCountdown(){
 const sent=ref(false),count=ref(0);let timer
 function start(){sent.value=true;count.value=60;clearInterval(timer);timer=setInterval(()=>{if(--count.value<=0)clearInterval(timer)},1000)}
 onUnmounted(()=>clearInterval(timer))
 return {sent,count,start}
}

/** Demo verification code accepted by every local code check. */
export const DEMO_CODE='123456'
