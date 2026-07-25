import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import { resolve } from 'node:path'
import test from 'node:test'
import { computed, h, onMounted, ref, shallowRef, Transition, watch } from 'vue'
import {
  __resetDialogLayersForTests,
  useDialogLifecycle
} from '../src/admin/composables/useDialogLifecycle.js'
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

const dispatchBubblingKey = async (harness, node, key, modifiers = {}) => {
  const event = await dispatchKey(harness, node, key, modifiers)
  if (!event.propagationStopped) {
    harness.document.dispatchEvent(event)
    await harness.flush()
  }
  return event
}

const createModalSelectHost = (selectComponent, state) => ({
  name: 'PanelSingleSelectModalHost',
  setup() {
    const visible = ref(true)
    const selectDisabled = ref(false)
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

    state.visible = visible
    state.selectDisabled = selectDisabled
    state.phase = lowerLifecycle.phase
    state.upperPhase = upperLifecycle.phase
    state.openUpper = () => { upperVisible.value = true }
    state.closeUpper = () => { upperVisible.value = false }

    return () => h('div', [
      h(Transition, {
        name: 'panel-select-modal-test',
        appear: true,
        onAfterEnter: lowerLifecycle.onAfterEnter,
        onAfterLeave: lowerLifecycle.onAfterLeave
      }, {
        default: () => lowerLifecycle.rendered.value
          ? h('div', {
              'data-testid': 'modal-popup-layer',
              style: {
                position: 'fixed',
                inset: '0',
                overflow: 'visible',
                transform: 'none',
                ...lowerLifecycle.layerStyle.value
              }
            }, [
              h('section', {
                ref: dialogRef,
                role: 'dialog',
                'aria-modal': 'true',
                'aria-label': 'Edit account',
                'data-testid': 'modal-frame',
                style: {
                  overflow: 'hidden',
                  transform: 'translateX(40px) scale(0.96)'
                }
              }, [
                h('button', { ref: initialFocusRef, 'data-testid': 'modal-before' }, 'Before'),
                h(selectComponent, { ...baseProps, disabled: selectDisabled.value }),
                h('button', { 'data-testid': 'modal-after' }, 'After')
              ])
            ])
          : null
      }),
      h(Transition, {
        name: 'panel-select-upper-modal-test',
        onAfterEnter: upperLifecycle.onAfterEnter,
        onAfterLeave: upperLifecycle.onAfterLeave
      }, {
        default: () => upperLifecycle.rendered.value && upperLifecycle.phase.value !== 'closing'
          ? h('div', {
              'data-testid': 'upper-modal-popup-layer',
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
                'aria-label': 'Confirm account',
                'data-testid': 'upper-modal-frame',
                style: {
                  overflow: 'hidden',
                  transform: 'scale(0.96)'
                }
              }, [
                h('button', { ref: upperInitialFocusRef, 'data-testid': 'upper-modal-action' }, 'Confirm')
              ])
            ])
          : null
      })
    ])
  }
})

const setQuery = async (harness, value) => {
  const input = harness.findByTestId('panel-single-select-search')
  assert.ok(input)
  input.value = value
  input.dispatchEvent({ type: 'input', target: input })
  await harness.flush()
  return input
}

const renderedOptions = (harness) => harness.allNodes().filter((node) => node.getAttribute?.('role') === 'option')

const findHostNode = (root, predicate) => {
  if (predicate(root)) return root
  for (const child of root?.children ?? []) {
    const match = findHostNode(child, predicate)
    if (match) return match
  }
  return undefined
}

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

test('an active option disabled by refresh is never exposed as selected or actively styled', async (t) => {
  const component = await loadVueSfc(componentFile)
  const state = { committedRenders: [] }
  const host = {
    name: 'DynamicOptionsSelectHost',
    setup() {
      const currentOptions = ref(options)
      state.currentOptions = currentOptions
      watch(currentOptions, () => {
        const disabledActive = findHostNode(globalThis.document.body, (node) => (
          node.getAttribute?.('role') === 'option' && node.textContent === 'Needs review'
        ))
        state.committedRenders.push({
          disabled: disabledActive?.disabled,
          selected: disabledActive?.getAttribute?.('aria-selected'),
          activelyStyled: disabledActive?.classList?.contains('bg-blue-50') ?? false
        })
      }, { flush: 'post' })

      return () => h(component, {
        ...baseProps,
        options: currentOptions.value
      })
    }
  }
  const harness = await createSfcHarness(host)
  t.after(harness.cleanup)

  harness.findByTestId('panel-single-select-trigger').click()
  await harness.flush()
  state.currentOptions.value = options.map((option) => (
    option.value === 'review' ? { ...option, disabled: true } : option
  ))
  await harness.flush()

  assert.deepEqual(state.committedRenders, [{
    disabled: true,
    selected: 'false',
    activelyStyled: false
  }])
  const disabledOption = renderedOptions(harness).find((option) => option.textContent === 'Needs review')
  assert.equal(disabledOption.getAttribute('aria-selected'), 'false')
  assert.equal(disabledOption.classList.contains('bg-blue-50'), false)
  assert.equal(harness.findByTestId('panel-single-select-search').getAttribute('aria-activedescendant'), 'account-state-option-string-61-63-74-69-76-65')
  assert.equal(harness.emitted.length, 0)
})

test('unmount invalidates pending selector DOM lookups and animation frames', async (t) => {
  const component = await loadVueSfc(componentFile)
  const state = {}
  const host = {
    name: 'UnmountableSelectHost',
    setup() {
      const visible = ref(true)
      state.visible = visible
      return () => visible.value
        ? h(component, {
            ...baseProps,
            modelValue: 'active',
            idBase: 'reused-selector'
          })
        : h('p', { 'data-testid': 'replacement-content' }, 'Replacement content')
    }
  }
  const harness = await createSfcHarness(host)
  t.after(harness.cleanup)

  const staleIdLookups = []
  harness.document.getElementById = (id) => {
    staleIdLookups.push(id)
    return undefined
  }
  const harnessRequestAnimationFrame = globalThis.requestAnimationFrame
  let queuedFrames = 0
  globalThis.requestAnimationFrame = (callback) => {
    queuedFrames += 1
    return harnessRequestAnimationFrame(callback)
  }

  harness.findByTestId('panel-single-select-trigger').click()
  state.visible.value = false
  await harness.flush()

  assert.ok(harness.findByTestId('replacement-content'))
  assert.equal(harness.findByTestId('panel-single-select-panel'), undefined)
  assert.deepEqual(staleIdLookups, [])
  assert.equal(queuedFrames, 0)
})

test('a replacement reusing idBase receives only its own queued DOM work', async (t) => {
  const component = await loadVueSfc(componentFile)
  const state = {}
  const autoOpeningSelect = {
    name: 'AutoOpeningReplacementSelect',
    props: {
      autoOpen: Boolean,
      modelValue: [String, Number]
    },
    setup(props) {
      onMounted(() => {
        if (!props.autoOpen) return
        findHostNode(globalThis.document.body, (node) => (
          node.getAttribute?.('data-testid') === 'panel-single-select-trigger'
        ))?.click()
      })
      return () => h(component, {
        ...baseProps,
        idBase: 'reused-selector',
        modelValue: props.modelValue
      })
    }
  }
  const host = {
    name: 'ReplacingSelectHost',
    setup() {
      const generation = ref(0)
      state.generation = generation
      return () => h(autoOpeningSelect, {
        key: generation.value,
        autoOpen: generation.value > 0,
        modelValue: generation.value > 0 ? 'active' : 'review'
      })
    }
  }
  const harness = await createSfcHarness(host)
  t.after(harness.cleanup)

  const scrolledIds = []
  harness.document.getElementById = (id) => {
    const node = findHostNode(harness.document.body, (candidate) => candidate.getAttribute?.('id') === id)
    if (node) node.scrollIntoView = () => { scrolledIds.push(id) }
    return node
  }

  harness.findByTestId('panel-single-select-trigger').click()
  state.generation.value += 1
  await harness.flush()

  const replacementSearch = harness.findByTestId('panel-single-select-search')
  const replacementActiveId = 'reused-selector-option-string-61-63-74-69-76-65'
  assert.equal(replacementSearch.getAttribute('aria-activedescendant'), replacementActiveId)
  assert.equal(harness.document.activeElement, replacementSearch)
  assert.deepEqual(scrolledIds, [replacementActiveId])
  assert.equal(harness.emitted.length, 0)
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

test('an empty-string option remains a committed cached value and becomes orphan-invalid when removed', async (t) => {
  const component = await loadVueSfc(componentFile)
  const harness = await createSfcHarness(component, {
    ...baseProps,
    modelValue: '',
    options: [
      { value: '', label: 'No parent' },
      { value: 'root', label: 'Root account' }
    ]
  })
  t.after(harness.cleanup)

  const trigger = harness.findByTestId('panel-single-select-trigger')
  assert.match(trigger.textContent, /No parent/)
  assert.equal(trigger.getAttribute('aria-invalid'), 'false')

  harness.props.options = [{ value: 'root', label: 'Root account' }]
  await harness.flush()

  assert.match(trigger.textContent, /No parent/, 'the cached empty-string option label is retained')
  assert.equal(trigger.getAttribute('aria-invalid'), 'true')
  assert.match(trigger.getAttribute('aria-describedby'), /account-state-orphaned/)
  assert.match(harness.findByTestId('panel-single-select-orphaned').textContent, /已失效/)
  assert.equal(harness.props.modelValue, '')
  assert.equal(harness.emitted.length, 0)
})

test('duplicate option values are rejected deterministically and exposed as a configuration error', async (t) => {
  const component = await loadVueSfc(componentFile)
  const harness = await createSfcHarness(component, {
    ...baseProps,
    options: [
      { value: 'review', label: 'Review queue A' },
      { value: 'review', label: 'Review queue B' }
    ]
  })
  t.after(harness.cleanup)

  const trigger = harness.findByTestId('panel-single-select-trigger')
  const configError = harness.findByTestId('panel-single-select-config-error')
  assert.equal(trigger.getAttribute('aria-invalid'), 'true')
  assert.match(trigger.getAttribute('aria-describedby'), /account-state-config-error/)
  assert.equal(configError.getAttribute('role'), 'alert')
  assert.match(configError.textContent, /重复/)

  trigger.click()
  await harness.flush()
  assert.equal(trigger.getAttribute('aria-expanded'), 'false')
  assert.equal(harness.findByTestId('panel-single-select-panel'), undefined)
  assert.equal(renderedOptions(harness).length, 0)
  assert.equal(harness.emitted.length, 0)
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

test('panel uses a modal-owned viewport host outside a transformed overflow-hidden modal frame', async (t) => {
  const component = await loadVueSfc(componentFile)
  const state = { closeCount: 0 }
  const harness = await createSfcHarness(createModalSelectHost(component, state), {})
  t.after(() => {
    harness.cleanup()
    __resetDialogLayersForTests()
  })
  await harness.finishTransitions()

  const trigger = harness.findByTestId('panel-single-select-trigger')
  const modalFrame = harness.findByTestId('modal-frame')
  const modalPopupLayer = harness.findByTestId('modal-popup-layer')
  globalThis.window.innerWidth = 1024
  globalThis.window.innerHeight = 640
  trigger.getBoundingClientRect = () => ({
    top: 100,
    right: 500,
    bottom: 140,
    left: 200,
    width: 300,
    height: 40
  })
  trigger.click()
  await harness.flush()

  const panel = harness.findByTestId('panel-single-select-panel')
  assert.equal(modalFrame.style.overflow, 'hidden')
  assert.match(modalFrame.style.transform, /scale/)
  assert.equal(modalPopupLayer.style.position, 'fixed')
  assert.equal(modalPopupLayer.style.overflow, 'visible')
  assert.equal(modalPopupLayer.style.transform, 'none')
  assert.equal(panel.parent, modalPopupLayer)
  assert.equal(modalFrame.contains(panel), false)
  assert.equal(modalPopupLayer.contains(panel), true)
  assert.equal(panel.style.position, 'fixed')
  assert.match(panel.style.left, /200px/)
  assert.match(panel.style.top, /146px/)
})

test('a modal-owned panel follows its lower dialog through nested lifecycle isolation', async (t) => {
  const component = await loadVueSfc(componentFile)
  const state = { closeCount: 0 }
  const harness = await createSfcHarness(createModalSelectHost(component, state), {})
  t.after(() => {
    harness.cleanup()
    __resetDialogLayersForTests()
  })
  await harness.finishTransitions()

  const trigger = harness.findByTestId('panel-single-select-trigger')
  trigger.click()
  await harness.flush()
  await harness.finishTransitions()
  const lowerLayer = harness.findByTestId('modal-popup-layer')
  const lowerFrame = harness.findByTestId('modal-frame')
  const panel = harness.findByTestId('panel-single-select-panel')
  assert.equal(panel.parent, lowerLayer)
  assert.equal(lowerLayer.inert, false)

  state.openUpper()
  await harness.flush()
  await harness.finishTransitions()
  assert.equal(state.upperPhase.value, 'open')
  assert.equal(lowerFrame.inert, true)
  assert.equal(lowerLayer.inert, true)
  assert.equal(lowerLayer.getAttribute('aria-hidden'), 'true')
  assert.equal(harness.findByTestId('upper-modal-popup-layer').inert, false)

  state.closeUpper()
  await harness.flush()
  await harness.finishTransitions()
  assert.equal(lowerFrame.inert, false)
  assert.equal(lowerLayer.inert, false)
  assert.equal(lowerLayer.getAttribute('aria-hidden'), null)
  assert.equal(trigger.getAttribute('aria-expanded'), 'true')
  assert.equal(harness.document.activeElement, harness.findByTestId('panel-single-select-search'))
})

test('Escape in an open panel is owned by the panel and does not close its parent modal', async (t) => {
  const component = await loadVueSfc(componentFile)
  const state = { closeCount: 0 }
  const harness = await createSfcHarness(createModalSelectHost(component, state), {})
  t.after(() => {
    harness.cleanup()
    __resetDialogLayersForTests()
  })
  await harness.finishTransitions()
  assert.equal(state.phase.value, 'open')

  const trigger = harness.findByTestId('panel-single-select-trigger')
  trigger.click()
  await harness.flush()
  await harness.finishTransitions()
  const search = harness.findByTestId('panel-single-select-search')
  const escape = await dispatchBubblingKey(harness, search, 'Escape')

  assert.equal(escape.defaultPrevented, true)
  assert.equal(escape.propagationStopped, true)
  assert.equal(state.closeCount, 0)
  assert.ok(harness.findByTestId('modal-frame'))
  await harness.finishTransitions()
  assert.equal(trigger.getAttribute('aria-expanded'), 'false')
  assert.equal(harness.document.activeElement, trigger)
})

test('Tab from an open panel moves focus exactly once within the real parent modal', async (t) => {
  const component = await loadVueSfc(componentFile)
  const state = { closeCount: 0 }
  const harness = await createSfcHarness(createModalSelectHost(component, state), {})
  t.after(() => {
    harness.cleanup()
    __resetDialogLayersForTests()
  })
  await harness.finishTransitions()

  const trigger = harness.findByTestId('panel-single-select-trigger')
  const after = harness.findByTestId('modal-after')
  const originalAfterFocus = after.focus
  let afterFocusCount = 0
  after.focus = () => {
    afterFocusCount += 1
    originalAfterFocus()
  }

  trigger.click()
  await harness.flush()
  await harness.finishTransitions()
  let search = harness.findByTestId('panel-single-select-search')
  const forwardTab = await dispatchBubblingKey(harness, search, 'Tab')
  assert.equal(forwardTab.defaultPrevented, true)
  assert.equal(forwardTab.propagationStopped, true)
  await harness.finishTransitions()
  assert.equal(afterFocusCount, 1)
  assert.equal(harness.document.activeElement, after)
  assert.equal(state.closeCount, 0)

  const originalTriggerFocus = trigger.focus
  let triggerFocusCount = 0
  trigger.focus = () => {
    triggerFocusCount += 1
    originalTriggerFocus()
  }
  trigger.click()
  await harness.flush()
  await harness.finishTransitions()
  search = harness.findByTestId('panel-single-select-search')
  const backwardTab = await dispatchBubblingKey(harness, search, 'Tab', { shiftKey: true })
  assert.equal(backwardTab.defaultPrevented, true)
  assert.equal(backwardTab.propagationStopped, true)
  await harness.finishTransitions()
  assert.equal(triggerFocusCount, 1)
  assert.equal(harness.document.activeElement, trigger)
  assert.equal(state.closeCount, 0)
})

test('state close moves focus to the logical next control when the trigger becomes disabled during leave', async (t) => {
  const component = await loadVueSfc(componentFile)
  const state = { closeCount: 0 }
  const harness = await createSfcHarness(createModalSelectHost(component, state), {})
  t.after(() => {
    harness.cleanup()
    __resetDialogLayersForTests()
  })
  await harness.finishTransitions()

  const trigger = harness.findByTestId('panel-single-select-trigger')
  const after = harness.findByTestId('modal-after')
  const originalAfterFocus = after.focus
  let afterFocusCount = 0
  after.focus = () => {
    afterFocusCount += 1
    originalAfterFocus()
  }

  trigger.click()
  await harness.flush()
  await harness.finishTransitions()
  assert.equal(harness.document.activeElement, harness.findByTestId('panel-single-select-search'))

  state.selectDisabled.value = true
  await harness.flush()
  assert.equal(trigger.disabled, true)
  assert.equal(trigger.getAttribute('aria-expanded'), 'true', 'the trigger remains expanded through leave')
  await harness.finishTransitions()

  assert.equal(trigger.getAttribute('aria-expanded'), 'false')
  assert.equal(harness.findByTestId('panel-single-select-panel'), undefined)
  assert.equal(afterFocusCount, 1)
  assert.equal(harness.document.activeElement, after)
  assert.equal(state.closeCount, 0)
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
  assert.equal(trigger.getAttribute('aria-required'), null)
  assert.match(trigger.getAttribute('aria-label'), /必填/)
  assert.match(trigger.getAttribute('aria-describedby'), /account-state-required/)
  assert.match(harness.findByTestId('panel-single-select-required').textContent, /必填/)
  trigger.click()
  await harness.flush()
  assert.equal(harness.findByTestId('panel-single-select-panel'), undefined)

  harness.props.disabled = false
  harness.props.readonly = true
  await harness.flush()
  assert.equal(trigger.disabled, false)
  assert.equal(trigger.getAttribute('aria-readonly'), null)
  trigger.click()
  await harness.flush()
  assert.equal(harness.findByTestId('panel-single-select-panel'), undefined)
  assert.match(trigger.textContent, /Needs review/)
  assert.match(trigger.textContent, /只读/)
  assert.match(trigger.getAttribute('aria-label'), /只读/)

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
