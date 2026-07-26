import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import { resolve } from 'node:path'
import test from 'node:test'
import { computed, h, ref, shallowRef, Transition } from 'vue'
import {
  __resetDialogLayersForTests,
  useDialogLifecycle
} from '../src/admin/composables/useDialogLifecycle.js'
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

const dispatchBubblingKey = async (harness, node, key, modifiers = {}) => {
  const event = await dispatchKey(harness, node, key, modifiers)
  if (!event.propagationStopped) {
    harness.document.dispatchEvent(event)
    await harness.flush()
  }
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

const describedIds = (combobox) => (combobox.getAttribute('aria-describedby') || '')
  .split(/\s+/)
  .filter(Boolean)

const createModalSelectHost = (selectComponent, state, { safeFixedAncestor = false } = {}) => ({
  name: 'SelectOnlyComboboxModalHost',
  setup() {
    const visible = ref(true)
    const dialogRef = shallowRef(null)
    const initialFocusRef = shallowRef(null)
    const lowerLifecycle = useDialogLifecycle({
      open: computed(() => visible.value),
      dialogRef,
      initialFocusRef,
      returnFocusRef: shallowRef(null),
      requestClose: () => {
        state.closeCount += 1
        visible.value = false
      }
    })
    const upperVisible = ref(false)
    const upperDialogRef = shallowRef(null)
    const upperInitialFocusRef = shallowRef(null)
    const upperLifecycle = useDialogLifecycle({
      open: computed(() => upperVisible.value),
      dialogRef: upperDialogRef,
      initialFocusRef: upperInitialFocusRef,
      returnFocusRef: shallowRef(null),
      requestClose: () => { upperVisible.value = false }
    })

    state.openUpper = () => { upperVisible.value = true }
    state.closeUpper = () => { upperVisible.value = false }
    state.upperLifecycle = upperLifecycle

    const lowerDialog = () => h('section', {
      ref: dialogRef,
      role: 'dialog',
      'aria-modal': 'true',
      'aria-label': 'Transfer account',
      'data-testid': 'select-modal-frame'
    }, [
      h('button', { ref: initialFocusRef, 'data-testid': 'select-modal-before' }, 'Before'),
      h(selectComponent, baseProps)
    ])

    return () => h('div', [
      h(Transition, {
        name: 'select-modal-test',
        appear: true,
        onAfterEnter: lowerLifecycle.onAfterEnter,
        onAfterLeave: lowerLifecycle.onAfterLeave
      }, {
        default: () => lowerLifecycle.rendered.value
          ? (safeFixedAncestor
              ? h('div', {
                  'data-testid': 'safe-fixed-popup-layer',
                  style: {
                    position: 'fixed',
                    inset: '0',
                    overflow: 'visible',
                    transform: 'none',
                    ...lowerLifecycle.layerStyle.value
                  }
                }, [lowerDialog()])
              : lowerDialog())
          : null
      }),
      h(Transition, {
        name: 'select-upper-modal-test',
        onAfterEnter: upperLifecycle.onAfterEnter,
        onAfterLeave: upperLifecycle.onAfterLeave
      }, {
        default: () => upperLifecycle.rendered.value
          ? h('div', {
              'data-testid': 'select-upper-layer',
              style: {
                position: 'fixed',
                inset: '0',
                overflow: 'visible',
                transform: 'none',
                ...upperLifecycle.layerStyle.value
              }
            }, [
              h('section', {
                ref: upperDialogRef,
                role: 'dialog',
                'aria-modal': 'true',
                'aria-label': 'Confirm transfer',
                'data-testid': 'select-upper-dialog'
              }, [
                h('button', { ref: upperInitialFocusRef, 'data-testid': 'select-upper-action' }, 'Confirm')
              ])
            ])
          : null
      })
    ])
  }
})

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
  assert.equal(combobox.getAttribute('aria-controls'), null)
  assert.equal(harness.document.getElementById('transfer-to-listbox'), null)
  await dispatchKey(harness, combobox, 'Enter')
  assert.equal(combobox.getAttribute('aria-controls'), 'transfer-to-listbox')
  assert.ok(harness.document.getElementById('transfer-to-listbox'))
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
  assert.equal(combobox.getAttribute('aria-controls'), null)
  assert.equal(combobox.getAttribute('aria-activedescendant'), null)
  assert.equal(harness.document.getElementById('transfer-to-listbox'), null)
  await harness.finishTransitions()
  assert.equal(renderedOptions(harness).length, 0)
  assert.equal(harness.document.getElementById('transfer-to-listbox'), null)

  await dispatchKey(harness, combobox, 'Enter')
  assert.equal(combobox.getAttribute('aria-controls'), 'transfer-to-listbox')
  assert.ok(harness.document.getElementById('transfer-to-listbox'))
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

test('retains a legal empty-string selection when it becomes orphaned', async (t) => {
  const component = await loadVueSfc(componentFile)
  const harness = await createSfcHarness(component, {
    ...baseProps,
    idBase: 'empty-string-value',
    modelValue: '',
    options: [
      { value: '', label: '未分配' },
      { value: 'market', label: '市币' }
    ]
  })
  t.after(harness.cleanup)

  const combobox = harness.findByTestId('select-only-combobox')
  assert.match(combobox.textContent, /未分配/)
  assert.equal(combobox.getAttribute('aria-invalid'), 'false')

  harness.props.options = [{ value: 'market', label: '市币' }]
  await harness.flush()

  assert.match(combobox.textContent, /未分配/)
  assert.equal(combobox.getAttribute('aria-invalid'), 'true')
  assert.ok(harness.findByTestId('select-only-combobox-orphaned'))
  assert.equal(harness.props.modelValue, '')
})

test('associates only mounted component and consumer-owned error descriptions', async (t) => {
  const component = await loadVueSfc(componentFile)
  const harness = await createSfcHarness(component, {
    ...baseProps,
    errorId: 'consumer-error'
  })
  t.after(harness.cleanup)

  const consumerError = harness.document.createElement('p')
  consumerError.setAttribute('id', 'consumer-error')
  consumerError.textContent = 'Consumer validation error'
  harness.document.body.appendChild(consumerError)
  const combobox = harness.findByTestId('select-only-combobox')
  const assertDescriptionsAreLive = (expected) => {
    assert.deepEqual(describedIds(combobox), expected)
    for (const id of expected) assert.ok(harness.document.getElementById(id), `${id} is mounted`)
  }

  harness.props.options = [{ value: 'market', label: '市币' }]
  await harness.flush()
  assertDescriptionsAreLive(['transfer-to-orphaned'])

  harness.props.modelValue = 'market'
  harness.props.options = [
    { value: 'market', label: '市币' },
    { value: 'market', label: '重复市币' }
  ]
  await harness.flush()
  assertDescriptionsAreLive(['transfer-to-config-error'])

  harness.props.options = [{ value: 'market', label: '市币' }]
  harness.props.invalid = true
  await harness.flush()
  assertDescriptionsAreLive(['consumer-error'])

  harness.props.modelValue = 'trading'
  await harness.flush()
  assertDescriptionsAreLive(['consumer-error', 'transfer-to-orphaned'])

  harness.props.modelValue = 'market'
  harness.props.options = [
    { value: 'market', label: '市币' },
    { value: 'market', label: '重复市币' }
  ]
  await harness.flush()
  assertDescriptionsAreLive(['consumer-error', 'transfer-to-config-error'])
})

test('a printable key opens a closed combobox and moves active without committing', async (t) => {
  const component = await loadVueSfc(componentFile)
  const harness = await createSfcHarness(component, {
    ...baseProps,
    modelValue: 'market',
    options: [
      { value: 'market', label: 'Alpha' },
      { value: 'bravo', label: 'Bravo' },
      { value: 'beta', label: 'Beta' }
    ]
  })
  t.after(harness.cleanup)

  const combobox = harness.findByTestId('select-only-combobox')
  const event = await dispatchKey(harness, combobox, 'b')

  assert.equal(event.defaultPrevented, true)
  assert.equal(combobox.getAttribute('aria-expanded'), 'true')
  assert.match(combobox.getAttribute('aria-activedescendant'), /option-string-62-72-61-76-6f$/)
  assert.equal(harness.props.modelValue, 'market')
  assert.equal(harness.emitted.length, 0)
})

test('repeated type-ahead characters cycle matching enabled options and wrap', async (t) => {
  const component = await loadVueSfc(componentFile)
  const harness = await createSfcHarness(component, {
    ...baseProps,
    modelValue: 'alpha',
    options: [
      { value: 'alpha', label: 'Alpha' },
      { value: 'bravo', label: 'Bravo' },
      { value: 'blocked', label: 'Blocked', disabled: true },
      { value: 'beta', label: 'Beta' }
    ]
  })
  t.after(harness.cleanup)

  const combobox = harness.findByTestId('select-only-combobox')
  await dispatchKey(harness, combobox, 'b')
  assert.match(combobox.getAttribute('aria-activedescendant'), /option-string-62-72-61-76-6f$/)
  await dispatchKey(harness, combobox, 'b')
  assert.match(combobox.getAttribute('aria-activedescendant'), /option-string-62-65-74-61$/)
  await dispatchKey(harness, combobox, 'b')
  assert.match(combobox.getAttribute('aria-activedescendant'), /option-string-62-72-61-76-6f$/)
  assert.equal(harness.emitted.length, 0)
})

test('type-ahead starts after the current active option and wraps to an earlier match', async (t) => {
  const component = await loadVueSfc(componentFile)
  const harness = await createSfcHarness(component, {
    ...baseProps,
    modelValue: 'charlie',
    options: [
      { value: 'bravo', label: 'Bravo' },
      { value: 'beta', label: 'Beta' },
      { value: 'charlie', label: 'Charlie' }
    ]
  })
  t.after(harness.cleanup)

  const combobox = harness.findByTestId('select-only-combobox')
  await dispatchKey(harness, combobox, 'b')
  assert.match(combobox.getAttribute('aria-activedescendant'), /option-string-62-72-61-76-6f$/)
})

test('type-ahead supports multi-character prefixes', async (t) => {
  const component = await loadVueSfc(componentFile)
  const harness = await createSfcHarness(component, {
    ...baseProps,
    modelValue: 'alpha',
    options: [
      { value: 'alpha', label: 'Alpha' },
      { value: 'bravo', label: 'Bravo' },
      { value: 'blue', label: 'Blue' },
      { value: 'beta', label: 'Beta' }
    ]
  })
  t.after(harness.cleanup)

  const combobox = harness.findByTestId('select-only-combobox')
  await dispatchKey(harness, combobox, 'b')
  await dispatchKey(harness, combobox, 'l')
  assert.match(combobox.getAttribute('aria-activedescendant'), /option-string-62-6c-75-65$/)
  assert.equal(harness.emitted.length, 0)
})

test('type-ahead resets its prefix after the timeout', async (t) => {
  const component = await loadVueSfc(componentFile)
  const harness = await createSfcHarness(component, {
    ...baseProps,
    modelValue: 'alpha',
    options: [
      { value: 'alpha', label: 'Alpha' },
      { value: 'bravo', label: 'Bravo' },
      { value: 'blue', label: 'Blue' },
      { value: 'beta', label: 'Beta' }
    ]
  })
  t.after(harness.cleanup)

  const combobox = harness.findByTestId('select-only-combobox')
  await dispatchKey(harness, combobox, 'b')
  await dispatchKey(harness, combobox, 'l')
  assert.match(combobox.getAttribute('aria-activedescendant'), /option-string-62-6c-75-65$/)
  await new Promise((resolvePromise) => setTimeout(resolvePromise, 525))
  await dispatchKey(harness, combobox, 'b')
  assert.match(combobox.getAttribute('aria-activedescendant'), /option-string-62-65-74-61$/)
})

test('outside pointer closes without committing and leaves the trigger focused', async (t) => {
  const component = await loadVueSfc(componentFile)
  const harness = await createSfcHarness(component, baseProps)
  t.after(harness.cleanup)

  const outside = harness.document.createElement('button')
  harness.document.body.appendChild(outside)
  const combobox = harness.findByTestId('select-only-combobox')
  combobox.focus()
  await dispatchKey(harness, combobox, 'Enter')
  harness.document.dispatchEvent({ type: 'pointerdown', target: outside })
  await harness.flush()

  assert.equal(combobox.getAttribute('aria-expanded'), 'false')
  assert.equal(harness.props.modelValue, 'trading')
  assert.equal(harness.emitted.length, 0)
  assert.equal(harness.document.activeElement, combobox)
})

test('close motion keeps the visual options until leave completes without live references or duplicate work', async (t) => {
  const component = await loadVueSfc(componentFile)
  let harness
  harness = await createSfcHarness(component, baseProps, {
    'onUpdate:modelValue': (value) => { harness.props.modelValue = value }
  })
  t.after(harness.cleanup)

  const combobox = harness.findByTestId('select-only-combobox')
  await dispatchKey(harness, combobox, 'Enter')
  await dispatchKey(harness, combobox, 'ArrowDown')
  await dispatchKey(harness, combobox, 'Enter')

  const leavingPopup = harness.findByTestId('select-only-combobox-popup')
  assert.ok(leavingPopup)
  assert.match(leavingPopup.textContent, /市币/)
  assert.match(leavingPopup.textContent, /理财/)
  assert.equal(combobox.getAttribute('aria-expanded'), 'false')
  assert.equal(combobox.getAttribute('aria-controls'), null)
  assert.equal(combobox.getAttribute('aria-activedescendant'), null)
  assert.equal(harness.document.getElementById('transfer-to-listbox'), null)

  combobox.click()
  await dispatchKey(harness, combobox, 'Enter')
  assert.equal(combobox.getAttribute('aria-expanded'), 'false')
  assert.equal(harness.emitted.filter(([name]) => name === 'onUpdate:modelValue').length, 1)

  await harness.finishTransitions()
  assert.equal(harness.findByTestId('select-only-combobox-popup'), undefined)
})

test('popup flips and recomputes position for window scroll resize and visual viewport changes', async (t) => {
  const component = await loadVueSfc(componentFile)
  const harness = await createSfcHarness(component, baseProps, {}, {
    innerWidth: 800,
    innerHeight: 800,
    visualViewport: { width: 800, height: 800, offsetLeft: 0, offsetTop: 0 }
  })
  t.after(harness.cleanup)

  let rect = { top: 700, right: 300, bottom: 740, left: 100, width: 200, height: 40 }
  const combobox = harness.findByTestId('select-only-combobox')
  combobox.getBoundingClientRect = () => rect
  await dispatchKey(harness, combobox, 'Enter')
  const popup = harness.findByTestId('select-only-combobox-popup')
  const aboveTop = popup.style.top

  rect = { top: 100, right: 300, bottom: 140, left: 100, width: 200, height: 40 }
  harness.window.dispatchEvent({ type: 'resize' })
  await harness.flush()
  assert.notEqual(popup.style.top, aboveTop)
  assert.match(popup.style.top, /146px/)

  rect = { top: 180, right: 360, bottom: 220, left: 160, width: 200, height: 40 }
  harness.window.dispatchEvent({ type: 'scroll' })
  await harness.flush()
  assert.match(popup.style.left, /160px/)

  harness.window.visualViewport.offsetLeft = 40
  harness.window.visualViewport.offsetTop = 50
  harness.window.visualViewport.width = 320
  harness.window.visualViewport.height = 260
  harness.window.visualViewport.dispatchEvent({ type: 'resize' })
  await harness.flush()
  assert.match(popup.style.left, /clamp/)
  const visualViewportTop = popup.style.top
  harness.window.visualViewport.offsetTop = 70
  harness.window.visualViewport.dispatchEvent({ type: 'scroll' })
  await harness.flush()
  assert.notEqual(popup.style.top, visualViewportTop)
})

test('a body fallback popup host is dialog-owned focus-contained layered and cleaned once', async (t) => {
  __resetDialogLayersForTests()
  const component = await loadVueSfc(componentFile)
  const state = { closeCount: 0 }
  const harness = await createSfcHarness(createModalSelectHost(component, state))
  t.after(() => {
    harness.cleanup()
    __resetDialogLayersForTests()
  })
  await harness.finishTransitions()

  const combobox = harness.findByTestId('select-only-combobox')
  combobox.focus()
  await dispatchKey(harness, combobox, 'Enter')
  const host = harness.findByTestId('select-only-combobox-portal-host')
  const popup = harness.findByTestId('select-only-combobox-popup')
  const lowerDialog = harness.findByTestId('select-modal-frame')
  assert.ok(host)
  assert.equal(host.parent, harness.document.body)
  assert.equal(popup.parent, host)
  assert.equal(host.style.position, 'fixed')
  assert.equal(host.style.inset, '0')
  assert.equal(host.style.zIndex, '1001')
  assert.equal(host.inert, false)

  const tab = await dispatchBubblingKey(harness, combobox, 'Tab')
  assert.equal(tab.defaultPrevented, true)
  assert.equal(harness.document.activeElement, harness.findByTestId('select-modal-before'))
  assert.equal(state.closeCount, 0)
  await harness.finishTransitions()
  assert.equal(harness.findByTestId('select-only-combobox-portal-host'), undefined)
  assert.equal(harness.document.eventLog.filter(({ type, node }) => type === 'dom-remove' && node === host).length, 1)

  combobox.focus()
  await dispatchKey(harness, combobox, 'Enter')
  const layeredHost = harness.findByTestId('select-only-combobox-portal-host')
  state.openUpper()
  await harness.flush()
  await harness.finishTransitions()
  const upperLayer = harness.findByTestId('select-upper-layer')
  assert.equal(lowerDialog.inert, true)
  assert.equal(layeredHost.inert, true)
  assert.equal(layeredHost.getAttribute('aria-hidden'), 'true')
  assert.ok(Number(layeredHost.style.zIndex) < Number(upperLayer.style.zIndex))

  state.closeUpper()
  await harness.flush()
  await state.upperLifecycle.onAfterLeave()
  assert.equal(lowerDialog.inert, false)
  assert.equal(layeredHost.inert, false)
  assert.equal(layeredHost.getAttribute('aria-hidden'), null)
})

test('a safe fixed dialog ancestor remains the portal target without creating a body host', async (t) => {
  __resetDialogLayersForTests()
  const component = await loadVueSfc(componentFile)
  const state = { closeCount: 0 }
  const harness = await createSfcHarness(createModalSelectHost(component, state, { safeFixedAncestor: true }))
  t.after(() => {
    harness.cleanup()
    __resetDialogLayersForTests()
  })
  await harness.finishTransitions()

  const combobox = harness.findByTestId('select-only-combobox')
  await dispatchKey(harness, combobox, 'Enter')
  const popup = harness.findByTestId('select-only-combobox-popup')
  const safeLayer = harness.findByTestId('safe-fixed-popup-layer')
  assert.equal(popup.parent, safeLayer)
  assert.equal(harness.findByTestId('select-only-combobox-portal-host'), undefined)
})

test('unmount cancels owned listeners animation frame type-ahead timer and body host exactly once', async (t) => {
  __resetDialogLayersForTests()
  const nativeSetTimeout = globalThis.setTimeout
  const nativeClearTimeout = globalThis.clearTimeout
  const typeAheadTimers = new Set()
  globalThis.setTimeout = (callback, delay, ...args) => {
    const id = nativeSetTimeout(callback, delay, ...args)
    if (delay === 500) typeAheadTimers.add(id)
    return id
  }
  globalThis.clearTimeout = (id) => {
    typeAheadTimers.delete(id)
    return nativeClearTimeout(id)
  }
  t.after(() => {
    globalThis.setTimeout = nativeSetTimeout
    globalThis.clearTimeout = nativeClearTimeout
    __resetDialogLayersForTests()
  })

  const component = await loadVueSfc(componentFile)
  const state = { closeCount: 0 }
  const harness = await createSfcHarness(createModalSelectHost(component, state), {}, {}, {
    innerWidth: 800,
    innerHeight: 600,
    visualViewport: { width: 800, height: 600, offsetLeft: 0, offsetTop: 0 }
  })
  await harness.finishTransitions()
  const combobox = harness.findByTestId('select-only-combobox')
  combobox.getBoundingClientRect = () => ({ top: 100, right: 300, bottom: 140, left: 100, width: 200, height: 40 })
  await dispatchKey(harness, combobox, 'b')
  const host = harness.findByTestId('select-only-combobox-portal-host')

  assert.equal(typeAheadTimers.size, 1)
  assert.ok(harness.pendingAnimationFrameCount() > 0)
  assert.equal(harness.document.listenerCount('pointerdown'), 1)
  assert.equal(harness.window.listenerCount('resize'), 1)
  assert.equal(harness.window.listenerCount('scroll'), 1)
  assert.equal(harness.window.visualViewport.listenerCount('resize'), 1)
  assert.equal(harness.window.visualViewport.listenerCount('scroll'), 1)

  const pendingFramesBeforeCleanup = harness.pendingAnimationFrameCount()
  harness.cleanup()
  assert.equal(typeAheadTimers.size, 0)
  assert.ok(harness.pendingAnimationFrameCount() < pendingFramesBeforeCleanup)
  assert.ok(harness.document.eventLog.some(({ type }) => type === 'animation-frame-cancelled'))
  assert.equal(harness.document.listenerCount('pointerdown'), 0)
  assert.equal(harness.window.listenerCount('resize'), 0)
  assert.equal(harness.window.listenerCount('scroll'), 0)
  assert.equal(harness.window.visualViewport.listenerCount('resize'), 0)
  assert.equal(harness.window.visualViewport.listenerCount('scroll'), 0)
  assert.equal(harness.findByTestId('select-only-combobox-portal-host'), undefined)
  assert.equal(harness.document.eventLog.filter(({ type, node }) => type === 'dom-remove' && node === host).length, 1)
})

test('popup motion CSS preserves required timings and reduced-motion behavior', async () => {
  const source = await readFile(componentFile, 'utf8')
  assert.match(source, /select-only-combobox-enter-active\s*\{[^}]*150ms ease-out/s)
  assert.match(source, /select-only-combobox-leave-active\s*\{[^}]*100ms ease-in/s)
  assert.match(source, /@media \(prefers-reduced-motion: reduce\)[\s\S]*transition-duration:\s*50ms/)
  assert.match(source, /@media \(prefers-reduced-motion: reduce\)[\s\S]*transform:\s*none/)
})

test('popup geometry clamps every edge to its corresponding safe-area inset', async (t) => {
  const component = await loadVueSfc(componentFile)
  const harness = await createSfcHarness(component, baseProps, {}, {
    innerWidth: 360,
    innerHeight: 480
  })
  t.after(harness.cleanup)

  const combobox = harness.findByTestId('select-only-combobox')
  combobox.getBoundingClientRect = () => ({ top: 420, right: 355, bottom: 460, left: 260, width: 95, height: 40 })
  await dispatchKey(harness, combobox, 'Enter')
  const popup = harness.findByTestId('select-only-combobox-popup')

  assert.match(popup.style.left, /clamp\([\s\S]*safe-area-inset-left[\s\S]*safe-area-inset-right/)
  assert.match(popup.style.top, /clamp\([\s\S]*safe-area-inset-top[\s\S]*safe-area-inset-bottom/)
  assert.match(popup.style.width, /safe-area-inset-left[\s\S]*safe-area-inset-right/)
  assert.match(popup.style.maxHeight, /safe-area-inset-top[\s\S]*safe-area-inset-bottom/)
})
