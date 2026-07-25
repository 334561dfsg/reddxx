import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import { resolve } from 'node:path'
import test from 'node:test'
import { createSfcHarness, loadVueSfc } from './helpers/vueSfcHarness.js'

const componentFile = resolve(process.cwd(), 'src/admin/components/form/PanelSingleSelect.vue')

const options = [
  { value: 'active', label: 'Active users', searchText: 'enabled accounts' },
  { value: 'review', label: 'Needs review', searchText: 'manual queue' },
  { value: 'blocked', label: 'Blocked', searchText: 'restricted', disabled: true },
  { value: 0, label: 'Zero level', searchText: 'starter' }
]

const baseProps = {
  modelValue: 'review',
  options,
  label: 'Account state',
  placeholder: 'Choose a state',
  searchLabel: 'Search account state',
  idBase: 'account-state'
}

const dispatchKey = async (harness, node, key, modifiers = {}) => {
  const event = {
    type: 'keydown',
    key,
    shiftKey: false,
    altKey: false,
    ctrlKey: false,
    metaKey: false,
    defaultPrevented: false,
    propagationStopped: false,
    preventDefault() { this.defaultPrevented = true },
    stopPropagation() { this.propagationStopped = true },
    ...modifiers
  }
  node.dispatchEvent(event)
  await harness.flush()
  return event
}

const setQuery = async (harness, value) => {
  const input = harness.findByTestId('panel-single-select-search')
  assert.ok(input)
  input.value = value
  input.dispatchEvent({ type: 'input', target: input })
  await harness.flush()
  return input
}

const renderedOptions = (harness) => harness.allNodes().filter((node) => node.getAttribute?.('role') === 'option')

test('draft filtering, hover, and Arrow navigation never commit and non-submit close restores the selection', async (t) => {
  const component = await loadVueSfc(componentFile)
  const harness = await createSfcHarness(component, baseProps)
  t.after(harness.cleanup)

  const trigger = harness.findByTestId('panel-single-select-trigger')
  assert.match(trigger.textContent, /Needs review/)
  assert.match(trigger.textContent, /更改/)
  trigger.click()
  await harness.flush()

  const search = harness.findByTestId('panel-single-select-search')
  assert.equal(trigger.getAttribute('aria-expanded'), 'true')
  assert.equal(search.value, '')
  assert.equal(renderedOptions(harness).find((option) => option.textContent === 'Needs review').getAttribute('aria-selected'), 'true')

  await setQuery(harness, 'ENABLED ACCOUNTS')
  assert.deepEqual(renderedOptions(harness).map((option) => option.textContent), ['Active users'])
  assert.equal(harness.emitted.length, 0)
  assert.match(trigger.textContent, /Needs review/)

  const activeOption = renderedOptions(harness)[0]
  activeOption.dispatchEvent({ type: 'mouseenter', target: activeOption })
  await harness.flush()
  await dispatchKey(harness, search, 'ArrowDown')
  assert.equal(harness.emitted.length, 0)
  assert.match(trigger.textContent, /Needs review/)

  await dispatchKey(harness, search, 'Escape')
  assert.equal(trigger.getAttribute('aria-expanded'), 'true', 'expanded remains true during the close motion')
  await harness.finishTransitions()
  assert.equal(trigger.getAttribute('aria-expanded'), 'false')
  assert.equal(harness.document.activeElement, trigger)
  assert.match(trigger.textContent, /Needs review/)
  assert.equal(harness.emitted.length, 0)

  trigger.click()
  await harness.flush()
  assert.equal(harness.findByTestId('panel-single-select-search').value, '')
})

test('click and Enter are the only paths that commit an enabled option', async (t) => {
  const component = await loadVueSfc(componentFile)
  const changes = []
  let harness
  harness = await createSfcHarness(component, baseProps, {
    'onUpdate:modelValue': (value) => { harness.props.modelValue = value },
    onChange: (value, option) => changes.push({ value, label: option.label })
  })
  t.after(harness.cleanup)

  const trigger = harness.findByTestId('panel-single-select-trigger')
  trigger.click()
  await harness.flush()
  renderedOptions(harness).find((option) => option.textContent === 'Active users').click()
  await harness.flush()

  assert.equal(harness.props.modelValue, 'active')
  assert.deepEqual(changes, [{ value: 'active', label: 'Active users' }])
  assert.equal(
    renderedOptions(harness).find((option) => option.textContent === 'Active users').getAttribute('aria-selected'),
    'true'
  )
  assert.equal(trigger.getAttribute('aria-expanded'), 'true')
  await harness.finishTransitions()
  assert.match(trigger.textContent, /Active users/)

  trigger.click()
  await harness.flush()
  const search = harness.findByTestId('panel-single-select-search')
  await dispatchKey(harness, search, 'ArrowDown')
  await dispatchKey(harness, search, 'Enter')
  assert.equal(harness.props.modelValue, 'review')
  assert.deepEqual(changes, [
    { value: 'active', label: 'Active users' },
    { value: 'review', label: 'Needs review' }
  ])
})

test('panel disclosure and inner combobox expose stable ARIA and caret-safe keyboard navigation', async (t) => {
  const component = await loadVueSfc(componentFile)
  const harness = await createSfcHarness(component, baseProps)
  t.after(harness.cleanup)

  const trigger = harness.findByTestId('panel-single-select-trigger')
  assert.equal(trigger.getAttribute('aria-controls'), 'account-state-panel')
  assert.equal(trigger.getAttribute('aria-haspopup'), null)
  trigger.click()
  await harness.flush()

  const panel = harness.findByTestId('panel-single-select-panel')
  const search = harness.findByTestId('panel-single-select-search')
  const listbox = harness.allNodes().find((node) => node.getAttribute?.('role') === 'listbox')
  assert.equal(panel.getAttribute('id'), 'account-state-panel')
  assert.equal(search.getAttribute('role'), 'combobox')
  assert.equal(search.getAttribute('aria-autocomplete'), 'list')
  assert.equal(search.getAttribute('aria-expanded'), 'true')
  assert.equal(search.getAttribute('aria-controls'), 'account-state-listbox')
  assert.equal(search.getAttribute('aria-label'), 'Search account state')
  assert.equal(listbox.getAttribute('id'), 'account-state-listbox')

  const initialActiveId = search.getAttribute('aria-activedescendant')
  const initialActive = renderedOptions(harness).find((option) => option.getAttribute('id') === initialActiveId)
  assert.equal(initialActive.textContent, 'Needs review')
  assert.equal(renderedOptions(harness).filter((option) => option.getAttribute('aria-selected') === 'true').length, 1)

  for (const key of ['Home', 'End', 'ArrowLeft', 'ArrowRight']) {
    const event = await dispatchKey(harness, search, key)
    assert.equal(event.defaultPrevented, false, `${key} retains native input behavior`)
    assert.equal(search.getAttribute('aria-activedescendant'), initialActiveId)
  }
  const modifiedArrow = await dispatchKey(harness, search, 'ArrowDown', { metaKey: true })
  assert.equal(modifiedArrow.defaultPrevented, false)
  assert.equal(search.getAttribute('aria-activedescendant'), initialActiveId)

  const arrow = await dispatchKey(harness, search, 'ArrowDown')
  assert.equal(arrow.defaultPrevented, true)
  const movedActive = renderedOptions(harness).find((option) => option.getAttribute('aria-selected') === 'true')
  assert.equal(movedActive.textContent, 'Zero level', 'disabled options are skipped')
  const disabledOption = renderedOptions(harness).find((option) => option.textContent === 'Blocked')
  assert.equal(disabledOption.getAttribute('aria-disabled'), 'true')
  assert.equal(disabledOption.disabled, true)

  const stableZeroId = movedActive.getAttribute('id')
  await setQuery(harness, 'starter')
  assert.equal(renderedOptions(harness)[0].getAttribute('id'), stableZeroId)
})

test('option IDs remain unique for values whose URL encodings could otherwise collide', async (t) => {
  const component = await loadVueSfc(componentFile)
  const harness = await createSfcHarness(component, {
    ...baseProps,
    modelValue: '/',
    options: [
      { value: '/', label: 'Slash' },
      { value: '_2F', label: 'Encoded-looking value' }
    ]
  })
  t.after(harness.cleanup)

  harness.findByTestId('panel-single-select-trigger').click()
  await harness.flush()
  const ids = renderedOptions(harness).map((option) => option.getAttribute('id'))
  assert.equal(new Set(ids).size, 2)
})

test('panel is portaled to the application root and flips within the viewport', async (t) => {
  const component = await loadVueSfc(componentFile)
  const harness = await createSfcHarness(component, baseProps)
  t.after(harness.cleanup)

  globalThis.window.innerWidth = 1024
  globalThis.window.innerHeight = 640
  const trigger = harness.findByTestId('panel-single-select-trigger')
  let triggerRect = {
    top: 560,
    right: 1090,
    bottom: 600,
    left: 990,
    width: 100,
    height: 40
  }
  trigger.getBoundingClientRect = () => triggerRect
  trigger.click()
  await harness.flush()

  const panel = harness.findByTestId('panel-single-select-panel')
  assert.equal(panel.parent, harness.document.body)
  assert.equal(panel.getAttribute('data-placement'), 'top')
  assert.equal(panel.style.position, 'fixed')
  assert.match(panel.style.left, /728px/)
  assert.match(panel.style.width, /288px/)
  assert.match(panel.style.top, /170px/)

  globalThis.window.innerWidth = 240
  triggerRect = {
    top: 80,
    right: 400,
    bottom: 120,
    left: 0,
    width: 400,
    height: 40
  }
  await setQuery(harness, 'active')
  assert.match(panel.style.left, /8px/)
  assert.match(panel.style.width, /224px/)
})

test('panel positioning uses the visual viewport when a virtual keyboard constrains the page', async (t) => {
  const component = await loadVueSfc(componentFile)
  const harness = await createSfcHarness(component, baseProps)
  t.after(harness.cleanup)

  globalThis.window.innerWidth = 1024
  globalThis.window.innerHeight = 640
  globalThis.window.visualViewport = {
    width: 400,
    height: 300,
    offsetTop: 200,
    offsetLeft: 20
  }
  const trigger = harness.findByTestId('panel-single-select-trigger')
  trigger.getBoundingClientRect = () => ({
    top: 430,
    right: 480,
    bottom: 470,
    left: 380,
    width: 100,
    height: 40
  })
  trigger.click()
  await harness.flush()

  const panel = harness.findByTestId('panel-single-select-panel')
  assert.equal(panel.getAttribute('data-placement'), 'top')
  assert.match(panel.style.left, /124px/)
  assert.match(panel.style.top, /208px/)
  assert.match(panel.style.maxHeight, /216px/)
})

test('panel remains inside the nearest modal accessibility subtree', async (t) => {
  const component = await loadVueSfc(componentFile)
  const harness = await createSfcHarness(component, baseProps)
  t.after(harness.cleanup)

  const trigger = harness.findByTestId('panel-single-select-trigger')
  const modalRoot = trigger.parent
  modalRoot.setAttribute('role', 'dialog')
  modalRoot.setAttribute('aria-modal', 'true')
  trigger.click()
  await harness.flush()

  assert.equal(harness.findByTestId('panel-single-select-panel').parent, modalRoot)
})

test('outside and Tab close discard the query while focus returns only for the intentional focus-return path', async (t) => {
  const component = await loadVueSfc(componentFile)
  const harness = await createSfcHarness(component, baseProps)
  t.after(harness.cleanup)

  const nextControl = {
    tag: 'button',
    children: [],
    parent: harness.document.body,
    tabIndex: 0,
    disabled: false,
    hidden: false,
    isConnected: true,
    focus() { harness.document.activeElement = this }
  }
  harness.document.body.children.push(nextControl)

  const trigger = harness.findByTestId('panel-single-select-trigger')
  trigger.focus()
  trigger.click()
  await harness.flush()
  await harness.finishTransitions()
  const search = await setQuery(harness, 'starter')
  assert.equal(harness.document.activeElement, search)

  harness.document.dispatchEvent({ type: 'pointerdown', target: harness.document.body })
  await harness.flush()
  assert.equal(trigger.getAttribute('aria-expanded'), 'true')
  await harness.finishTransitions()
  assert.equal(trigger.getAttribute('aria-expanded'), 'false')
  assert.equal(harness.document.activeElement, trigger)
  assert.match(trigger.textContent, /Needs review/)
  assert.equal(harness.emitted.length, 0)

  trigger.click()
  await harness.flush()
  const reopenedSearch = harness.findByTestId('panel-single-select-search')
  assert.equal(reopenedSearch.value, '')
  const tab = await dispatchKey(harness, reopenedSearch, 'Tab')
  assert.equal(tab.defaultPrevented, true)
  await harness.finishTransitions()
  assert.equal(trigger.getAttribute('aria-expanded'), 'false')
  assert.equal(harness.document.activeElement, nextControl)

  trigger.click()
  await harness.flush()
  const shiftTab = await dispatchKey(harness, harness.findByTestId('panel-single-select-search'), 'Tab', { shiftKey: true })
  assert.equal(shiftTab.defaultPrevented, true)
  await harness.finishTransitions()
  assert.equal(harness.document.activeElement, trigger)
})

test('disabled, readonly, required, and orphaned states preserve the committed business value', async (t) => {
  const component = await loadVueSfc(componentFile)
  let harness
  harness = await createSfcHarness(component, {
    ...baseProps,
    required: true,
    disabled: true,
    errorId: 'account-state-error'
  }, {
    'onUpdate:modelValue': (value) => { harness.props.modelValue = value }
  })
  t.after(harness.cleanup)

  const trigger = harness.findByTestId('panel-single-select-trigger')
  assert.equal(trigger.disabled, true)
  assert.equal(trigger.getAttribute('aria-disabled'), 'true')
  assert.equal(trigger.getAttribute('aria-required'), 'true')
  trigger.click()
  await harness.flush()
  assert.equal(harness.findByTestId('panel-single-select-panel'), undefined)

  harness.props.disabled = false
  harness.props.readonly = true
  await harness.flush()
  assert.equal(trigger.disabled, false)
  assert.equal(trigger.getAttribute('aria-readonly'), 'true')
  trigger.click()
  await harness.flush()
  assert.equal(harness.findByTestId('panel-single-select-panel'), undefined)
  assert.match(trigger.textContent, /Needs review/)
  assert.match(trigger.textContent, /只读/)

  harness.props.readonly = false
  harness.props.options = options.filter((option) => option.value !== 'review')
  await harness.flush()
  assert.match(trigger.textContent, /Needs review/, 'the cached committed label is retained')
  assert.equal(trigger.getAttribute('aria-invalid'), 'true')
  assert.match(trigger.getAttribute('aria-describedby'), /account-state-error/)
  assert.match(trigger.getAttribute('aria-describedby'), /account-state-orphaned/)
  assert.match(harness.findByTestId('panel-single-select-orphaned').textContent, /已失效/)
  assert.equal(harness.props.modelValue, 'review')
  assert.equal(harness.emitted.length, 0)

  trigger.click()
  await harness.flush()
  const active = renderedOptions(harness).find((option) => option.getAttribute('aria-selected') === 'true')
  assert.equal(active.textContent, 'Active users')
})

test('empty and refreshed results are announced without selecting or replacing the committed option', async (t) => {
  const component = await loadVueSfc(componentFile)
  const harness = await createSfcHarness(component, baseProps)
  t.after(harness.cleanup)

  const trigger = harness.findByTestId('panel-single-select-trigger')
  trigger.click()
  await harness.flush()
  await setQuery(harness, 'new queue')
  let status = harness.findByTestId('panel-single-select-status')
  assert.equal(status.getAttribute('role'), 'status')
  assert.equal(status.getAttribute('aria-live'), 'polite')
  assert.match(status.textContent, /0 个结果/)
  assert.match(harness.findByTestId('panel-single-select-empty').textContent, /没有匹配项/)

  harness.props.options = [
    { value: 'pending', label: 'Pending verification', searchText: 'new queue' },
    { value: 'blocked', label: 'Blocked', disabled: true }
  ]
  await harness.flush()
  status = harness.findByTestId('panel-single-select-status')
  assert.match(status.textContent, /1 个结果/)
  assert.deepEqual(renderedOptions(harness).map((option) => option.textContent), ['Pending verification'])
  assert.equal(renderedOptions(harness)[0].getAttribute('aria-selected'), 'true')
  assert.equal(harness.props.modelValue, 'review')
  assert.equal(harness.emitted.length, 0)
  assert.match(trigger.textContent, /Needs review/)
})

test('panel motion uses the required open, close, and reduced-motion timings', async () => {
  const source = await readFile(componentFile, 'utf8')

  assert.match(source, /150ms ease-out/)
  assert.match(source, /100ms ease-in/)
  assert.match(source, /prefers-reduced-motion: reduce/)
  assert.match(source, /transition-duration: 50ms/)
  assert.match(source, /transform: none/)
  assert.doesNotMatch(source, /<select\b/)
})
