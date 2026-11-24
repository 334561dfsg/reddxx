import { reactive, shallowRef } from 'vue'
import {createCurrentTrades} from './utils/mockCurrentTrades'
export const session = reactive({loggedIn:sessionStorage.getItem('nt-visitor')!=='true',mode:"common.demo.real",orders:createCurrentTrades(),subscriptions:[]})
export const modal=shallowRef(null)
export function openModal(type,title,data={}){if(!modal.value) modal.value={type,title,data}}
export function closeModal(){modal.value=null}
export function logout(){session.loggedIn=false;sessionStorage.setItem('nt-visitor','true')}
export function login(){session.loggedIn=true;sessionStorage.removeItem('nt-visitor')}

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
