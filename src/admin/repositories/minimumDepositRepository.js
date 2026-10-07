import { createMinimumDepositMfaSession } from '../../features/minimum-deposit/model.js'

import { browserMinimumDepositRepository as repository } from '../../features/minimum-deposit/browserRepository.js'
// Same demo code as the existing deposit-address rotation flow. Production
// must replace this adapter with server-side TOTP verification + atomic save.
async function verifyDemoCode(code) {
  if (String(code) !== '123456') throw new Error('谷歌验证码不正确，请重试')
}
export const minimumDepositRepository = {
  read: repository.read,
  createSession: () => createMinimumDepositMfaSession(repository, verifyDemoCode)
}
