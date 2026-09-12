import { ref } from 'vue'
import { usersList } from '../mock/user.js'
import { appendUserAuditLog } from './userAuditLogRepository.js'
import { publicDepositAddressRepository } from './publicDepositAddressRepository.js'
import { createUserDepositAddressRepository } from '../../features/user-deposit-address/repository.js'

export const userDepositAddressVersion = ref(0)
const repository = createUserDepositAddressRepository({
  userExists: id => usersList.some(user => String(user.id) === id),
  resolvePublic: (coin, network) => publicDepositAddressRepository.resolve(coin, network),
  appendAudit: ({ userId, before, after, requestId, action }) => appendUserAuditLog({
    targetUser: usersList.find(user => String(user.id) === userId),
    category: 'funds', action: action === 'restore' ? 'funds.deposit-address.restore' : 'funds.deposit-address.set',
    operator: { id: 'admin_current', name: '当前管理员' },
    before, after, reason: action === 'restore' ? '恢复使用公共收款地址' : '设置用户专属收款地址',
    related: { requestId }
  })
})
export const userDepositAddressRepository = {
  ...repository,
  execute(plan) {
    const result = repository.execute(plan)
    userDepositAddressVersion.value++
    return result
  }
}
