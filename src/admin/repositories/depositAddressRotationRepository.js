import { usersList } from '../mock/user.js'
import { publicDepositAddressRepository } from './publicDepositAddressRepository.js'
import { userDepositAddressRepository } from './userDepositAddressRepository.js'
import { withUserAuditTransaction } from './userAuditLogRepository.js'
import { createDepositAddressRotation } from '../../features/user-deposit-address/rotation.js'

// Demo verification only. Replace with server-side Google TOTP + transaction endpoint in production.
export async function verifyDemoGoogleCode(code) {
  if (String(code) !== '123456') throw new Error('谷歌验证码不正确，请重试')
}
export const depositAddressRotationRepository = createDepositAddressRotation({
  publicRepo: publicDepositAddressRepository,
  userRepo: userDepositAddressRepository,
  userExists: id => usersList.some(user => String(user.id) === id),
  verify: verifyDemoGoogleCode,
  auditTransaction: withUserAuditTransaction
})
