import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

const source = readFileSync(resolve(process.cwd(), 'src/pages/admin/user/UserListPage.vue'), 'utf8')

test('onchain wallet action opens a wallet drawer above the operation drawer', () => {
  const handler = source.match(/const handleOperationDrawerAction = async \(\{ id, user, trigger \}\) => \{([\s\S]*?)\n\}/)?.[1] || ''

  assert.match(source, /import UserOnchainWalletDrawer/)
  assert.match(source, /getUserOnchainWallet/)
  assert.match(source, /const onchainWalletOpen = ref\(false\)/)
  assert.match(source, /const onchainWalletUser = ref\(null\)/)
  assert.match(source, /const onchainWalletData = ref\(null\)/)
  assert.match(source, /const onchainWalletReturnFocus = ref\(null\)/)
  assert.match(handler, /if \(id === 'onchain-wallet'\) \{[\s\S]*?onchainWalletUser\.value = user[\s\S]*?onchainWalletData\.value = getUserOnchainWallet\(userIdOf\(user\)\)[\s\S]*?onchainWalletReturnFocus\.value = trigger[\s\S]*?onchainWalletOpen\.value = true[\s\S]*?return/)
  assert.doesNotMatch(handler.match(/if \(id === 'onchain-wallet'\) \{[\s\S]*?\n  \}/)?.[0] || '', /closeOperationDrawer\(\)/)
  assert.ok(source.indexOf('<UserOperationDrawer') < source.indexOf('<UserOnchainWalletDrawer'))
  assert.match(source, /<UserOnchainWalletDrawer[\s\S]*?:visible="onchainWalletOpen"[\s\S]*?:user="onchainWalletUser"[\s\S]*?:wallet="onchainWalletData"[\s\S]*?:return-focus="onchainWalletReturnFocus"[\s\S]*?@closed="clearOnchainWallet"/)
})

test('onchain wallet state clears only after the child drawer has closed', () => {
  assert.match(source, /const closeOnchainWallet = \(\) => \{\s*onchainWalletOpen\.value = false\s*\}/)
  assert.match(source, /const clearOnchainWallet = \(\) => \{[\s\S]*?onchainWalletUser\.value = null[\s\S]*?onchainWalletData\.value = null[\s\S]*?onchainWalletReturnFocus\.value = null/)
})
