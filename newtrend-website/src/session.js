import { reactive, shallowRef } from 'vue'
import {readStorage,writeStorage,removeStorage} from './utils/storage.js'
export const session = reactive({loggedIn:readStorage('nt-visitor','session')!=='true',mode:"common.demo.real"})
export const modal=shallowRef(null)
export function openModal(type,title,data={}){if(!modal.value) modal.value={type,title,data}}
export function closeModal(){modal.value=null}
export function logout(){session.loggedIn=false;writeStorage('nt-visitor','true','session')}
export function login(){session.loggedIn=true;removeStorage('nt-visitor','session')}

export function requestModeSwitch(mode) {
  if (!session.loggedIn || mode === session.mode || !['common.demo.real', 'common.demo.demo'].includes(mode)) return
  const demo = mode === 'common.demo.demo'
  openModal('account-confirm', demo ? 'common.demo.confirmTitle' : 'common.demo.confirmRealTitle', {
    modeSwitch: true,
    description: demo ? 'common.demo.confirmMessage' : 'common.demo.confirmRealMessage',
    confirmLabel: 'common.demo.confirmEnable',
    onConfirm: () => { session.mode = mode },
  })
}
