import { usersList } from '../mock/user.js'
import { createStaffRepository } from '../../features/user-staff/userStaff.js'
import { appendUserAuditLog } from './userAuditLogRepository.js'
let repository
export function getUserStaffRepository() {
  if (!repository) {
    let storage = null
    if (typeof window !== 'undefined') {
      try { storage = window.localStorage } catch { throw new Error('无法访问浏览器存储，员工数据暂不可用') }
    }
    repository = createStaffRepository({ users:usersList, storage, onAudit:entry=>appendUserAuditLog({targetUser:{uid:entry.userId,name:entry.username},source:'admin',operator:{id:'admin_current',name:'当前管理员'},category:'permission',action:entry.kind,result:'success',reason:entry.reason,before:entry.before,after:entry.after}) })
  }
  return repository
}
export function persistStaffUserUpdate(userId, patch) {
  if (repository) repository.persistUserUpdate(userId, patch)
}
