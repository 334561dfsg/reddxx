import { reactive, shallowRef } from 'vue'
export const session = reactive({loggedIn:sessionStorage.getItem('nt-visitor')!=='true',mode:"common.demo.real",orders:[],subscriptions:[]})
export const modal=shallowRef(null)
export function openModal(type,title,data={}){if(!modal.value) modal.value={type,title,data}}
export function closeModal(){modal.value=null}
export function logout(){session.loggedIn=false;sessionStorage.setItem('nt-visitor','true')}
export function login(){session.loggedIn=true;sessionStorage.removeItem('nt-visitor')}
