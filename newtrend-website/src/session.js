import { reactive, shallowRef } from 'vue'
import {readStorage,writeStorage,removeStorage} from './utils/storage.js'
import {MODES,MODE_REAL,isDemo} from './utils/accountMode.js'
export const session = reactive({loggedIn:readStorage('nt-visitor','session')!=='true',mode:MODE_REAL})
export const modal=shallowRef(null)
export function openModal(type,title,data={}){if(!modal.value) modal.value={type,title,data}}
export function closeModal(){modal.value=null}
export function logout(){session.loggedIn=false;writeStorage('nt-visitor','true','session')}
export function login(){session.loggedIn=true;removeStorage('nt-visitor','session')}
/**
 * Embedded login gate (user decision 2026-11-29): returns true when signed in. Signed out, it opens the login dialog
 * over the current page and returns false; after a successful login (password or wallet) the dialog closes and runs
 * `then`, normally the action itself, which checks its own conditions again.
 */
export function requireLogin(then){if(session.loggedIn)return true;openModal('login','auth.login',{then});return false}

export function requestModeSwitch(mode) {
  if (!session.loggedIn || mode === session.mode || !MODES.includes(mode)) return
  const demo = isDemo(mode)
  openModal('account-confirm', demo ? 'common.demo.confirmTitle' : 'common.demo.confirmRealTitle', {
    modeSwitch: true,
    description: demo ? 'common.demo.confirmMessage' : 'common.demo.confirmRealMessage',
    confirmLabel: 'common.demo.confirmEnable',
    onConfirm: () => { session.mode = mode },
  })
}
