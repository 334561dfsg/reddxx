import {reactive} from 'vue'
import {removeStorage} from './utils/storage.js'
const defaults={name:'Demo User',email:'demo@example.com',phone:'',fundPasswordSet:false,twoFactor:false,kyc:'none',advanced:'none',fontScale:'standard',referrer:'',devices:[{id:1,name:'Current browser',current:true,trusted:true},{id:2,name:'Demo laptop',current:false,trusted:false}]}
// Mock profile lives in memory only and resets on reload (no mock business data in browser storage).
// Clear the profile that earlier builds persisted so stale KYC/2FA/device state cannot linger.
removeStorage('nt-account')
export const account=reactive(structuredClone(defaults))
export function passwordValid(value){return value.length>=8&&value.length<=30&&/[a-z]/i.test(value)&&/[^a-z]/i.test(value)&&/^[A-Za-z0-9@#$*.]+$/.test(value)}
export function fileError(file,max=10){if(!file)return "account.ui.selectAFile";if(!['image/jpeg','image/png','application/pdf'].includes(file.type))return "account.ui.jpgPngOrPdfOnly";if(file.size>max*1024*1024)return "account.ui.fileIsTooLarge";return ''}
