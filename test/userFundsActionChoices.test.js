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

const findRadio = (harness, name, value) => harness.allNodes().find((node) => (
  node.tag === 'input' && node.getAttribute?.('type') === 'radio' &&
  node.getAttribute('name') === name && node.value === value
))

const selectWithArrow = async (harness, radio, key = 'ArrowRight') => {
  assert.ok(radio, 'expected native radio')
  radio.focus()
  const event = {
    type: 'keydown',
    key,
    defaultPrevented: false,
    preventDefault() { this.defaultPrevented = true }
  }
  radio.dispatchEvent(event)
  await harness.flush()
  assert.equal(event.defaultPrevented, false)
}

const fieldsetSummary = (harness) => harness.allNodes()
  .filter((node) => node.tag === 'fieldset')
  .map((fieldset) => ({
    legend: harness.allNodes().find((node) => node.tag === 'legend' && fieldset.contains(node))?.textContent.trim(),
    radioNames: harness.allNodes()
      .filter((node) => node.tag === 'input' && node.getAttribute?.('type') === 'radio' && fieldset.contains(node))
      .map((node) => node.getAttribute('name'))
  }))

const radioCard = (harness, radio) => harness.allNodes().find((node) => node.tag === 'label' && node.contains(radio))

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

test('funds action sources remove native selects and retain native radios', () => {
  for (const source of [read(depositFile), read(transferFile)]) {
    assert.doesNotMatch(source, /<select\b/)
    assert.match(source, /type="radio"/)
  }
})

test('every mounted funds choice fieldset has its visible legend and native radio group', async (t) => {
  const deposit = await createSfcHarness(await loadVueSfc(depositFile), { user, assets })
  const transfer = await createSfcHarness(await loadVueSfc(transferFile), { user, assets })
  t.after(deposit.cleanup)
  t.after(transfer.cleanup)

  await openDialog(deposit, '入金')
  await openDialog(transfer, '划转')

  assert.deepEqual(fieldsetSummary(deposit), [{
    legend: '选择入金账户',
    radioNames: ['deposit-account', 'deposit-account', 'deposit-account', 'deposit-account']
  }])
  assert.deepEqual(fieldsetSummary(transfer), [
    { legend: '从', radioNames: ['transfer-from-account', 'transfer-from-account', 'transfer-from-account', 'transfer-from-account'] },
    { legend: '到', radioNames: ['transfer-to-account', 'transfer-to-account', 'transfer-to-account', 'transfer-to-account'] },
    { legend: '币种', radioNames: ['transfer-coin', 'transfer-coin', 'transfer-coin'] }
  ])
})

test('deposit radio choice emits the existing deposit payload', async (t) => {
  const component = await loadVueSfc(depositFile)
  const harness = await createSfcHarness(component, { user, assets }, { onSubmit: () => {} })
  t.after(harness.cleanup)

  await openDialog(harness, '入金')
  await selectWithArrow(harness, findRadio(harness, 'deposit-account', 'market'))
  const wealth = findRadio(harness, 'deposit-account', 'wealth')
  assert.equal(harness.document.activeElement, wealth)
  assert.equal(wealth.checked, true)
  assert.match(radioCard(harness, wealth).textContent, /已选择/)
  await setInput(harness, '请输入入金数量', ' 25.50 ')
  await setInput(harness, '请输入备注信息（可选）', ' 批量入金 ')
  harness.findByText('确认入金操作', 'button').click()

  assert.deepEqual(harness.emitted, [[
    'onSubmit',
    { type: 'deposit', amount: '25.5', accountKey: 'wealth', remark: ' 批量入金 ' }
  ]])
})

test('transfer keyboard radio choices emit the existing transfer payload', async (t) => {
  const component = await loadVueSfc(transferFile)
  const harness = await createSfcHarness(component, { user, assets }, { onSubmit: () => {} })
  t.after(harness.cleanup)

  await openDialog(harness, '划转')
  await selectWithArrow(harness, findRadio(harness, 'transfer-from-account', 'market'))
  const wealthSource = findRadio(harness, 'transfer-from-account', 'wealth')
  assert.equal(harness.document.activeElement, wealthSource)
  assert.equal(wealthSource.checked, true)
  assert.match(radioCard(harness, wealthSource).textContent, /已选择/)

  await selectWithArrow(harness, findRadio(harness, 'transfer-to-account', 'trading'))
  const perpDestination = findRadio(harness, 'transfer-to-account', 'perp')
  assert.equal(harness.document.activeElement, perpDestination)
  assert.equal(perpDestination.checked, true)
  assert.match(radioCard(harness, perpDestination).textContent, /已选择/)

  await selectWithArrow(harness, findRadio(harness, 'transfer-coin', 'USDT'))
  const usdcCoin = findRadio(harness, 'transfer-coin', 'USDC')
  assert.equal(harness.document.activeElement, usdcCoin)
  assert.equal(usdcCoin.checked, true)
  assert.match(radioCard(harness, usdcCoin).textContent, /已选择/)

  await setInput(harness, '请输入划转的数量', ' 10.25 ')
  harness.allNodes().filter((node) => node.tag === 'button' && node.textContent.trim() === '划转').at(-1).click()

  assert.deepEqual(harness.emitted, [[
    'onSubmit',
    { type: 'transfer', amount: '10.25', fromAccountKey: 'wealth', toAccountKey: 'perp', coinKey: 'USDC' }
  ]])
})

test('transfer preserves and explains the selected disabled destination until the operator replaces it', async (t) => {
  const component = await loadVueSfc(transferFile)
  const harness = await createSfcHarness(component, { user, assets }, { onSubmit: () => {} })
  t.after(harness.cleanup)

  await openDialog(harness, '划转')
  await selectRadio(harness, 'transfer-from-account', 'trading')

  const source = findRadio(harness, 'transfer-from-account', 'trading')
  const tradingDestination = findRadio(harness, 'transfer-to-account', 'trading')
  const sameDestination = findRadio(harness, 'transfer-to-account', 'trading')
  assert.equal(source.checked, true)
  assert.equal(tradingDestination.checked, true)
  assert.equal(sameDestination.disabled, true)
  assert.match(radioCard(harness, sameDestination).textContent, /已选择，需重新选择/)
  const destinationFieldset = harness.allNodes().find((node) => node.tag === 'fieldset' && node.textContent.includes('当前“从”账户不能作为“到”账户'))
  const explanation = harness.allNodes().find((node) => node.tag === 'p' && node.textContent.includes('当前“从”账户不能作为“到”账户'))
  assert.equal(destinationFieldset.getAttribute('aria-describedby'), explanation.getAttribute('id'))
  assert.match(explanation.textContent, /当前“从”账户不能作为“到”账户/)
  assert.match(explanation.textContent, /当前已选择的“到”账户不可用，请重新选择/)

  await setInput(harness, '请输入划转的数量', ' 10.25 ')
  harness.allNodes().filter((node) => node.tag === 'button' && node.textContent.trim() === '划转').at(-1).click()
  await harness.flush()
  assert.deepEqual(harness.emitted, [])
  assert.match(explanation.textContent, /当前已选择的“到”账户不可用，请重新选择/)

  await selectRadio(harness, 'transfer-to-account', 'perp')
  await selectRadio(harness, 'transfer-coin', 'USDC')
  harness.allNodes().filter((node) => node.tag === 'button' && node.textContent.trim() === '划转').at(-1).click()

  assert.deepEqual(harness.emitted, [[
    'onSubmit',
    { type: 'transfer', amount: '10.25', fromAccountKey: 'trading', toAccountKey: 'perp', coinKey: 'USDC' }
  ]])
})
