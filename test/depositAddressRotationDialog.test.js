import test from 'node:test'
import assert from 'node:assert/strict'
import { resolve } from 'node:path'
import { createSfcHarness, loadVueSfc, loadVueSfcModuleUrl } from './helpers/vueSfcHarness.js'
import { publicDepositAddressRepository } from '../src/admin/repositories/publicDepositAddressRepository.js'
import { userDepositAddressRepository } from '../src/admin/repositories/userDepositAddressRepository.js'

test('confirm opens Google verification without writing; invalid verification keeps both dialogs and draft', async t => {
  const mfaPath = resolve('src/admin/components/MfaVerificationModal.vue')
  const component = await loadVueSfc(resolve('src/admin/components/user/DepositAddressRotationDialog.vue'), { vueImports: { [mfaPath]: loadVueSfcModuleUrl(mfaPath) } })
  const original = publicDepositAddressRepository.resolve('USDT', 'ERC20').address
  const harness = await createSfcHarness(component, { visible: true, user: { id: 'user_1001', username: 'agent_wang' }, order: { id: 'dp_test', coin: 'USDT', network: 'ERC20', toAddress: original } })
  t.after(harness.cleanup)
  await harness.finishTransitions()
  assert.ok(harness.findByText('当前订单使用'))
  const input = harness.allNodes().find(node => node.getAttribute?.('aria-label') === 'USDT ERC20 公共收款地址')
  assert.equal(input.value, original)
  assert.ok(input.getAttribute('class').includes('address-input--order'))
  input.value = '0x' + '8'.repeat(40)
  input.dispatchEvent({ type: 'input', target: input })
  await harness.flush()
  assert.ok(input.getAttribute('class').includes('address-input--changed'))
  assert.equal(input.getAttribute('class').includes('address-input--order'), false)
  assert.ok(harness.findByText(`该用户将使用原地址：${original}`))
  harness.findByText('确认修改', 'button').click()
  await harness.flush(); await harness.finishTransitions()
  assert.ok(harness.findByTestId('mfa-dialog-frame'))
  assert.equal(publicDepositAddressRepository.resolve('USDT', 'ERC20').address, original)
  const code = harness.allNodes().find(node => node.getAttribute?.('placeholder') === '请输入 6 位验证码')
  code.value = '000000'; code.dispatchEvent({ type: 'input', target: code })
  await harness.flush()
  harness.findByText('验证并继续', 'button').click()
  await harness.flush()
  assert.equal(publicDepositAddressRepository.resolve('USDT', 'ERC20').address, original)
  assert.equal(userDepositAddressRepository.list('user_1001').length, 0)
  assert.ok(harness.findByText('谷歌验证码不正确，请重试'))
  code.value = '123456'; code.dispatchEvent({ type: 'input', target: code })
  await harness.flush()
  harness.findByText('验证并继续', 'button').click()
  await harness.flush(); await harness.finishTransitions()
  assert.equal(publicDepositAddressRepository.resolve('USDT', 'ERC20').address, '0x' + '8'.repeat(40))
  assert.equal(userDepositAddressRepository.resolve('user_1001', 'USDT', 'ERC20').address, original)
  assert.ok(harness.findByText('修改成功', 'h3'))
})
