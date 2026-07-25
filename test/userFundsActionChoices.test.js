import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import test from 'node:test'
import { createSfcHarness, loadVueSfc } from './helpers/vueSfcHarness.js'

const depositFile = resolve(process.cwd(), 'src/admin/components/user/UserDepositAction.vue')
const transferFile = resolve(process.cwd(), 'src/admin/components/user/UserTransferAction.vue')
const read = (file) => readFileSync(file, 'utf8')

const user = { id: 'user_1001', username: '选择测试用户' }
const assets = {
  marketAccount: 1250.5,
  wealthAccount: 860,
  tradingContract: 540.2,
  perpetualContract: 320.8
}

const selectRadio = async (harness, name, value) => {
  const radio = harness.allNodes().find((node) => (
    node.tag === 'input' && node.getAttribute?.('type') === 'radio' &&
    node.getAttribute('name') === name && node.value === value
  ))
  assert.ok(radio, `expected ${name} radio for ${value}`)
  radio.checked = true
  radio.dispatchEvent({ type: 'change', target: radio })
  await harness.flush()
  return radio
}

const setInput = async (harness, placeholder, value) => {
  const input = harness.allNodes().find((node) => node.getAttribute?.('placeholder') === placeholder)
  assert.ok(input, `expected input with placeholder ${placeholder}`)
  input.value = value
  input.dispatchEvent({ type: 'input', target: input })
  await harness.flush()
}

const openDialog = async (harness, label) => {
  harness.findByText(label, 'button').click()
  await harness.flush()
  await harness.finishTransitions()
}

test('funds action choices replace native selects with visible, labelled radio groups', () => {
  for (const source of [read(depositFile), read(transferFile)]) {
    assert.doesNotMatch(source, /<select\b/)
    assert.match(source, /<fieldset\b/)
    assert.match(source, /<legend\b/)
    assert.match(source, /type="radio"/)
  }
})

test('deposit radio choice emits the existing deposit payload', async (t) => {
  const component = await loadVueSfc(depositFile)
  const harness = await createSfcHarness(component, { user, assets }, { onSubmit: () => {} })
  t.after(harness.cleanup)

  await openDialog(harness, '入金')
  await selectRadio(harness, 'deposit-account', 'wealth')
  await setInput(harness, '请输入入金数量', ' 25.50 ')
  await setInput(harness, '请输入备注信息（可选）', ' 批量入金 ')
  harness.findByText('确认入金操作', 'button').click()

  assert.deepEqual(harness.emitted, [[
    'onSubmit',
    { type: 'deposit', amount: '25.5', accountKey: 'wealth', remark: ' 批量入金 ' }
  ]])
})

test('transfer radio choice disables its selected source as a destination without changing the committed destination', async (t) => {
  const component = await loadVueSfc(transferFile)
  const harness = await createSfcHarness(component, { user, assets }, { onSubmit: () => {} })
  t.after(harness.cleanup)

  await openDialog(harness, '划转')
  await selectRadio(harness, 'transfer-from-account', 'trading')

  const source = harness.allNodes().find((node) => node.tag === 'input' && node.getAttribute?.('name') === 'transfer-from-account' && node.value === 'trading')
  const tradingDestination = harness.allNodes().find((node) => node.tag === 'input' && node.getAttribute?.('name') === 'transfer-to-account' && node.value === 'trading')
  const sameDestination = harness.allNodes().find((node) => node.tag === 'input' && node.getAttribute?.('name') === 'transfer-to-account' && node.value === 'trading')
  assert.equal(source.checked, true)
  assert.equal(tradingDestination.checked, true)
  assert.equal(sameDestination.disabled, true)
  assert.match(harness.allNodes().find((node) => node.tag === 'p' && node.textContent.includes('当前“从”账户不能作为“到”账户')).textContent, /当前“从”账户不能作为“到”账户/)

  await selectRadio(harness, 'transfer-to-account', 'perp')
  await selectRadio(harness, 'transfer-coin', 'USDC')
  await setInput(harness, '请输入划转的数量', ' 10.25 ')
  harness.allNodes().filter((node) => node.tag === 'button' && node.textContent.trim() === '划转').at(-1).click()

  assert.deepEqual(harness.emitted, [[
    'onSubmit',
    { type: 'transfer', amount: '10.25', fromAccountKey: 'trading', toAccountKey: 'perp', coinKey: 'USDC' }
  ]])
})
