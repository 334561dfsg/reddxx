import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import test from 'node:test'
import { createSfcHarness, loadVueSfc, loadVueSfcModuleUrl } from './helpers/vueSfcHarness.js'

const depositFile = resolve(process.cwd(), 'src/admin/components/user/UserDepositAction.vue')
const transferFile = resolve(process.cwd(), 'src/admin/components/user/UserTransferAction.vue')
const selectOnlyComboboxFile = resolve(process.cwd(), 'src/admin/components/form/SelectOnlyCombobox.vue')
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

const loadTransfer = async () => loadVueSfc(transferFile, {
  vueImports: { [selectOnlyComboboxFile]: loadVueSfcModuleUrl(selectOnlyComboboxFile) }
})

const findCombobox = (harness, idBase) => {
  const combobox = harness.allNodes().find((node) => (
    node.getAttribute?.('role') === 'combobox' &&
    node.getAttribute('aria-controls') === `${idBase}-listbox`
  ))
  assert.ok(combobox, `expected ${idBase} combobox`)
  return combobox
}

const comboboxDisplay = (harness, idBase) => {
  const display = findCombobox(harness, idBase).children[0]
  assert.ok(display, `expected ${idBase} combobox display`)
  return display
}

const dispatchKey = async (harness, node, key) => {
  const event = {
    type: 'keydown',
    key,
    defaultPrevented: false,
    preventDefault() { this.defaultPrevented = true }
  }
  node.dispatchEvent(event)
  await harness.flush()
  return event
}

const selectComboboxWithKeyboard = async (harness, idBase, arrowDownCount) => {
  const trigger = findCombobox(harness, idBase)
  trigger.focus()
  await dispatchKey(harness, trigger, 'Enter')
  for (let index = 0; index < arrowDownCount; index += 1) {
    await dispatchKey(harness, trigger, 'ArrowDown')
  }
  await dispatchKey(harness, trigger, 'Enter')
  await harness.finishTransitions()
  return trigger
}

const selectComboboxOption = async (harness, idBase, label) => {
  const trigger = findCombobox(harness, idBase)
  trigger.click()
  await harness.flush()
  const option = harness.allNodes().find((node) => (
    node.getAttribute?.('role') === 'option' && node.textContent.trim() === label
  ))
  assert.ok(option, `expected ${label} option in ${idBase}`)
  option.dispatchEvent({
    type: 'pointerdown',
    target: option,
    defaultPrevented: false,
    preventDefault() { this.defaultPrevented = true }
  })
  option.click()
  await harness.flush()
  await harness.finishTransitions()
  return trigger
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

test('deposit retains native radios while transfer uses select-only comboboxes', () => {
  const depositSource = read(depositFile)
  const transferSource = read(transferFile)

  assert.doesNotMatch(depositSource, /<select\b/)
  assert.match(depositSource, /type="radio"/)
  assert.doesNotMatch(transferSource, /<select\b/)
  assert.doesNotMatch(transferSource, /type="radio"/)
  assert.match(transferSource, /SelectOnlyCombobox/)
})

test('deposit keeps its fieldset radio group while transfer renders compact comboboxes', async (t) => {
  const deposit = await createSfcHarness(await loadVueSfc(depositFile), { user, assets })
  try {
    await openDialog(deposit, '入金')

    assert.deepEqual(fieldsetSummary(deposit), [{
      legend: '选择入金账户',
      radioNames: ['deposit-account', 'deposit-account', 'deposit-account', 'deposit-account']
    }])
  } finally {
    deposit.cleanup()
  }

  const transfer = await createSfcHarness(await loadTransfer(), { user, assets })
  t.after(transfer.cleanup)
  await openDialog(transfer, '划转')

  const transferDialog = transfer.allNodes().find((node) => node.getAttribute?.('role') === 'dialog')
  const fromTrigger = comboboxDisplay(transfer, 'transfer-from')
  const toTrigger = comboboxDisplay(transfer, 'transfer-to')
  const coinTrigger = comboboxDisplay(transfer, 'transfer-coin')
  assert.equal(fromTrigger.textContent.trim(), '市币')
  assert.equal(toTrigger.textContent.trim(), '交易合约')
  assert.equal(coinTrigger.textContent.trim(), '请选择')
  assert.ok(transferDialog)
  assert.equal(transfer.allNodes().filter((node) => (
    node.tag === 'select' && transferDialog.contains(node)
  )).length, 0)
  assert.equal(transfer.allNodes().filter((node) => (
    node.tag === 'input' && node.getAttribute?.('type') === 'radio' && transferDialog.contains(node)
  )).length, 0)
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

test('transfer keyboard combobox choices emit the existing transfer payload', async (t) => {
  const component = await loadTransfer()
  const harness = await createSfcHarness(component, { user, assets }, { onSubmit: () => {} })
  t.after(harness.cleanup)

  await openDialog(harness, '划转')
  const wealthSource = await selectComboboxWithKeyboard(harness, 'transfer-from', 1)
  assert.equal(harness.document.activeElement, wealthSource)
  assert.match(wealthSource.textContent, /理财/)

  const perpDestination = await selectComboboxWithKeyboard(harness, 'transfer-to', 1)
  assert.equal(harness.document.activeElement, perpDestination)
  assert.match(perpDestination.textContent, /永续合约/)

  const usdcCoin = await selectComboboxWithKeyboard(harness, 'transfer-coin', 1)
  assert.equal(harness.document.activeElement, usdcCoin)
  assert.match(usdcCoin.textContent, /USDC/)

  await setInput(harness, '请输入划转的数量', ' 10.25 ')
  harness.allNodes().filter((node) => node.tag === 'button' && node.textContent.trim() === '划转').at(-1).click()

  assert.deepEqual(harness.emitted, [[
    'onSubmit',
    { type: 'transfer', amount: '10.25', fromAccountKey: 'wealth', toAccountKey: 'perp', coinKey: 'USDC' }
  ]])
})

test('transfer preserves the destination conflict until the operator selects a different account', async (t) => {
  const component = await loadTransfer()
  const harness = await createSfcHarness(component, { user, assets }, { onSubmit: () => {} })
  t.after(harness.cleanup)

  await openDialog(harness, '划转')
  const source = await selectComboboxWithKeyboard(harness, 'transfer-from', 2)
  const destination = findCombobox(harness, 'transfer-to')
  assert.match(source.textContent, /交易合约/)
  assert.match(destination.textContent, /交易合约/)
  assert.equal(destination.getAttribute('aria-invalid'), 'true')
  assert.equal(destination.getAttribute('aria-describedby'), 'transfer-to-error')
  const explanation = harness.allNodes().find((node) => node.getAttribute?.('id') === 'transfer-to-error')
  assert.ok(explanation)
  assert.match(explanation.textContent, /“从”账户和“到”账户不能相同，请重新选择“到”账户。/)

  await setInput(harness, '请输入划转的数量', ' 10.25 ')
  harness.allNodes().filter((node) => node.tag === 'button' && node.textContent.trim() === '划转').at(-1).click()
  await harness.flush()
  assert.deepEqual(harness.emitted, [])
  await selectComboboxOption(harness, 'transfer-to', '永续合约')
  assert.equal(destination.getAttribute('aria-invalid'), 'false')
  assert.equal(destination.getAttribute('aria-describedby'), null)
  assert.equal(harness.allNodes().some((node) => node.getAttribute?.('id') === 'transfer-to-error'), false)
  await selectComboboxWithKeyboard(harness, 'transfer-coin', 1)
  harness.allNodes().filter((node) => node.tag === 'button' && node.textContent.trim() === '划转').at(-1).click()

  assert.deepEqual(harness.emitted, [[
    'onSubmit',
    { type: 'transfer', amount: '10.25', fromAccountKey: 'trading', toAccountKey: 'perp', coinKey: 'USDC' }
  ]])
})

test('transfer blocks unavailable committed accounts without replacing their values', async (t) => {
  const component = await loadTransfer()
  const harness = await createSfcHarness(component, { user, assets: null }, { onSubmit: () => {} })
  t.after(harness.cleanup)

  await openDialog(harness, '划转')
  const source = findCombobox(harness, 'transfer-from')
  const destination = findCombobox(harness, 'transfer-to')
  assert.match(source.textContent, /market/)
  assert.match(destination.textContent, /trading/)
  assert.equal(source.getAttribute('aria-invalid'), 'true')
  assert.equal(destination.getAttribute('aria-invalid'), 'true')

  await selectComboboxWithKeyboard(harness, 'transfer-coin', 1)
  await setInput(harness, '请输入划转的数量', '10.25')
  harness.allNodes().filter((node) => node.tag === 'button' && node.textContent.trim() === '划转').at(-1).click()
  await harness.flush()

  assert.deepEqual(harness.emitted, [])
  assert.match(source.textContent, /market/)
  assert.match(destination.textContent, /trading/)
})

test('transfer gives the required coin a field-owned error after submit and clears it on selection or reopen', async (t) => {
  const component = await loadTransfer()
  const harness = await createSfcHarness(component, { user, assets }, { onSubmit: () => {} })
  t.after(harness.cleanup)

  await openDialog(harness, '划转')
  await setInput(harness, '请输入划转的数量', '10.25')
  harness.allNodes().filter((node) => node.tag === 'button' && node.textContent.trim() === '划转').at(-1).click()
  await harness.flush()

  const coin = findCombobox(harness, 'transfer-coin')
  const coinError = harness.allNodes().find((node) => node.getAttribute?.('id') === 'transfer-coin-error')
  assert.deepEqual(harness.emitted, [])
  assert.equal(coin.getAttribute('aria-invalid'), 'true')
  assert.equal(coin.getAttribute('aria-describedby'), 'transfer-coin-error')
  assert.ok(coinError)
  assert.match(coinError.textContent, /请选择币种/)

  await selectComboboxWithKeyboard(harness, 'transfer-coin', 0)
  assert.equal(coin.getAttribute('aria-invalid'), 'false')
  assert.equal(coin.getAttribute('aria-describedby'), null)
  assert.equal(harness.allNodes().some((node) => node.getAttribute?.('id') === 'transfer-coin-error'), false)

  const closeButton = harness.allNodes().find((node) => node.tag === 'button' && node.getAttribute?.('aria-label') === '关闭')
  closeButton.click()
  await harness.flush()
  const closingOverlay = harness.allNodes().find((node) => (
    node.tag === 'div' && node.getAttribute?.('class').includes('fixed inset-0 grid place-items-center')
  ))
  closingOverlay.dispatchEvent({ type: 'transitionend', target: closingOverlay })
  await harness.finishTransitions()
  await openDialog(harness, '划转')
  assert.equal(findCombobox(harness, 'transfer-coin').getAttribute('aria-invalid'), 'false')
  assert.equal(harness.allNodes().some((node) => node.getAttribute?.('id') === 'transfer-coin-error'), false)
})
