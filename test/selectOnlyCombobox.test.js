import assert from 'node:assert/strict'
import { resolve } from 'node:path'
import test from 'node:test'
import { createSfcHarness, loadVueSfc } from './helpers/vueSfcHarness.js'

const componentFile = resolve(process.cwd(), 'src/admin/components/form/SelectOnlyCombobox.vue')

const baseProps = {
  modelValue: 'trading',
  options: [
    { value: 'market', label: '市币' },
    { value: 'wealth', label: '理财' },
    { value: 'trading', label: '交易合约' },
    { value: 'perp', label: '永续合约', disabled: true }
  ],
  label: '到',
  placeholder: '请选择',
  required: true,
  idBase: 'transfer-to'
}

const dispatchKey = async (harness, node, key, modifiers = {}) => {
  const event = {
    type: 'keydown',
    key,
    altKey: false,
    ctrlKey: false,
    metaKey: false,
    shiftKey: false,
    defaultPrevented: false,
    preventDefault() { this.defaultPrevented = true },
    ...modifiers
  }
  node.dispatchEvent(event)
  await harness.flush()
  return event
}

const dispatchPointerDown = async (harness, node) => {
  const event = {
    type: 'pointerdown',
    defaultPrevented: false,
    preventDefault() { this.defaultPrevented = true }
  }
  node.dispatchEvent(event)
  if (!event.defaultPrevented) node.focus()
  await harness.flush()
  return event
}

const renderedOptions = (harness) => harness.allNodes().filter((node) => (
  node.getAttribute?.('role') === 'option'
))

test('keeps focus on the combobox and commits with Enter', async (t) => {
  const component = await loadVueSfc(componentFile)
  const changes = []
  const harness = await createSfcHarness(component, baseProps, {
    'onUpdate:modelValue': (value) => { harness.props.modelValue = value },
    onChange: (value, option) => changes.push([value, option])
  })
  t.after(harness.cleanup)

  const combobox = harness.findByTestId('select-only-combobox')
  combobox.focus()
  await dispatchKey(harness, combobox, 'Enter')
  assert.equal(harness.document.activeElement, combobox)
  assert.equal(combobox.getAttribute('aria-activedescendant'), 'transfer-to-option-string-74-72-61-64-69-6e-67')

  await dispatchKey(harness, combobox, 'ArrowDown')
  assert.equal(combobox.getAttribute('aria-activedescendant'), 'transfer-to-option-string-6d-61-72-6b-65-74')
  assert.equal(harness.emitted.length, 0)

  await dispatchKey(harness, combobox, 'Enter')
  assert.deepEqual(harness.emitted.map(([name, value]) => [name, value]), [
    ['onUpdate:modelValue', 'market'],
    ['onChange', 'market']
  ])
  assert.equal(changes[0][1].label, '市币')
  assert.equal(combobox.getAttribute('aria-expanded'), 'false')
  assert.equal(harness.document.activeElement, combobox)
})

test('commits with Space exactly once while retaining combobox focus', async (t) => {
  const component = await loadVueSfc(componentFile)
  const harness = await createSfcHarness(component, baseProps, {
    'onUpdate:modelValue': (value) => { harness.props.modelValue = value },
    onChange: () => {}
  })
  t.after(harness.cleanup)

  const combobox = harness.findByTestId('select-only-combobox')
  combobox.focus()
  await dispatchKey(harness, combobox, 'Enter')
  await dispatchKey(harness, combobox, 'ArrowDown')
  await dispatchKey(harness, combobox, ' ')

  assert.deepEqual(harness.emitted.map(([name, value]) => [name, value]), [
    ['onUpdate:modelValue', 'market'],
    ['onChange', 'market']
  ])
  assert.equal(combobox.getAttribute('aria-expanded'), 'false')
  assert.equal(harness.document.activeElement, combobox)
})

test('pointer selection prevents option focus and retains main combobox focus after commit', async (t) => {
  const component = await loadVueSfc(componentFile)
  const harness = await createSfcHarness(component, baseProps, {
    'onUpdate:modelValue': (value) => { harness.props.modelValue = value }
  })
  t.after(harness.cleanup)

  const combobox = harness.findByTestId('select-only-combobox')
  combobox.focus()
  await dispatchKey(harness, combobox, 'Enter')
  const option = renderedOptions(harness).find((node) => node.textContent === '市币')
  assert.ok(option)

  const pointerDown = await dispatchPointerDown(harness, option)
  option.click()
  await harness.flush()

  assert.equal(pointerDown.defaultPrevented, true)
  assert.equal(harness.props.modelValue, 'market')
  assert.equal(harness.document.activeElement, combobox)
})

test('supports Home End Escape Tab and printable type-ahead without implicit commit', async (t) => {
  const component = await loadVueSfc(componentFile)
  const harness = await createSfcHarness(component, baseProps)
  t.after(harness.cleanup)

  const combobox = harness.findByTestId('select-only-combobox')
  await dispatchKey(harness, combobox, 'ArrowDown')
  await dispatchKey(harness, combobox, 'End')
  assert.equal(combobox.getAttribute('aria-activedescendant'), 'transfer-to-option-string-74-72-61-64-69-6e-67')
  await dispatchKey(harness, combobox, 'Home')
  assert.equal(combobox.getAttribute('aria-activedescendant'), 'transfer-to-option-string-6d-61-72-6b-65-74')
  await dispatchKey(harness, combobox, '理')
  assert.equal(combobox.getAttribute('aria-activedescendant'), 'transfer-to-option-string-77-65-61-6c-74-68')
  assert.equal(harness.emitted.length, 0)

  await dispatchKey(harness, combobox, 'Escape')
  assert.equal(combobox.getAttribute('aria-expanded'), 'false')
  assert.equal(harness.props.modelValue, 'trading')
  await dispatchKey(harness, combobox, 'Enter')
  const tab = await dispatchKey(harness, combobox, 'Tab')
  assert.equal(combobox.getAttribute('aria-expanded'), 'false')
  assert.equal(tab.defaultPrevented, false)
  assert.equal(harness.props.modelValue, 'trading')
})

test('exposes one active option and valid stable ARIA references', async (t) => {
  const component = await loadVueSfc(componentFile)
  const harness = await createSfcHarness(component, baseProps)
  t.after(harness.cleanup)

  const combobox = harness.findByTestId('select-only-combobox')
  assert.equal(combobox.getAttribute('role'), 'combobox')
  assert.equal(combobox.getAttribute('aria-controls'), 'transfer-to-listbox')
  await dispatchKey(harness, combobox, 'Enter')
  assert.equal(renderedOptions(harness).length, 4)
  assert.deepEqual(renderedOptions(harness).map((option) => option.getAttribute('id')), [
    'transfer-to-option-string-6d-61-72-6b-65-74',
    'transfer-to-option-string-77-65-61-6c-74-68',
    'transfer-to-option-string-74-72-61-64-69-6e-67',
    'transfer-to-option-string-70-65-72-70'
  ])
  assert.equal(renderedOptions(harness).filter((option) => option.getAttribute('aria-selected') === 'true').length, 1)
  assert.ok(renderedOptions(harness).some((option) => (
    option.getAttribute('id') === combobox.getAttribute('aria-activedescendant')
  )))

  await dispatchKey(harness, combobox, 'Escape')
  assert.equal(renderedOptions(harness).length, 0)
  assert.equal(combobox.getAttribute('aria-activedescendant'), null)
})

test('blocks disabled readonly duplicate and orphaned states without replacing values', async (t) => {
  const component = await loadVueSfc(componentFile)
  const harness = await createSfcHarness(component, { ...baseProps, disabled: true })
  t.after(harness.cleanup)

  const combobox = harness.findByTestId('select-only-combobox')
  await dispatchKey(harness, combobox, 'Enter')
  assert.equal(combobox.getAttribute('aria-expanded'), 'false')
  harness.props.disabled = false
  harness.props.readonly = true
  await harness.flush()
  await dispatchKey(harness, combobox, 'Enter')
  assert.equal(combobox.getAttribute('aria-expanded'), 'false')

  harness.props.readonly = false
  harness.props.options = [
    { value: 'market', label: '市币' },
    { value: 'market', label: '重复市币' }
  ]
  await harness.flush()
  assert.equal(combobox.getAttribute('aria-invalid'), 'true')
  assert.ok(harness.findByTestId('select-only-combobox-config-error'))
  await dispatchKey(harness, combobox, 'Enter')
  assert.equal(combobox.getAttribute('aria-expanded'), 'false')

  harness.props.options = [{ value: 'market', label: '市币' }]
  await harness.flush()
  assert.equal(combobox.textContent.includes('交易合约'), true)
  assert.equal(combobox.getAttribute('aria-invalid'), 'true')
  assert.ok(harness.findByTestId('select-only-combobox-orphaned'))
  assert.equal(harness.props.modelValue, 'trading')
})
