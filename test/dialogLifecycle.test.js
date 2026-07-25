import test from 'node:test'
import assert from 'node:assert/strict'
import { createRenderer, h, nextTick, ref, shallowRef } from 'vue'
import {
  __resetDialogLayersForTests,
  getFocusableElements,
  isTopDialogLayer,
  registerDialogLayer,
  unregisterDialogLayer,
  useDialogLifecycle
} from '../src/admin/composables/useDialogLifecycle.js'

const renderer = createRenderer({
  patchProp() {},
  insert(child, parent) {
    parent.children ||= []
    parent.children.push(child)
    child.parent = parent
  },
  remove(child) {
    const siblings = child.parent?.children || []
    const index = siblings.indexOf(child)
    if (index >= 0) siblings.splice(index, 1)
  },
  createElement: () => ({}),
  createText: (text) => ({ text }),
  createComment: (text) => ({ text }),
  setText(node, text) { node.text = text },
  setElementText(node, text) { node.text = text },
  parentNode: (node) => node.parent || null,
  nextSibling: () => null,
  querySelector: () => null,
  setScopeId() {},
  cloneNode: (node) => ({ ...node }),
  insertStaticContent(content, parent) {
    const node = { content, parent }
    parent.children ||= []
    parent.children.push(node)
    return [node, node]
  }
})

const flushLifecycle = async () => {
  await nextTick()
  await nextTick()
}

const createFakeDocument = () => {
  const listeners = new Map()
  const document = {
    activeElement: null,
    body: { children: [], style: { overflow: '' } },
    documentElement: { style: { overflow: '' } },
    addEventListener(type, listener) {
      const handlers = listeners.get(type) || new Set()
      handlers.add(listener)
      listeners.set(type, handlers)
    },
    removeEventListener(type, listener) {
      listeners.get(type)?.delete(listener)
    },
    dispatch(event) {
      for (const listener of listeners.get(event.type) || []) listener(event)
    },
    listenerCount(type) {
      return listeners.get(type)?.size || 0
    }
  }
  return document
}

const createFakeElement = (document, { focusable = false, focusables = [] } = {}) => {
  const attributes = new Map()
  const element = {
    disabled: false,
    hidden: false,
    inert: false,
    tabIndex: focusable ? 0 : -1,
    focus() { document.activeElement = element },
    querySelectorAll: () => focusables,
    contains(target) { return target === element },
    getAttribute(name) { return attributes.get(name) ?? null },
    hasAttribute(name) { return attributes.has(name) },
    setAttribute(name, value) { attributes.set(name, String(value)) },
    removeAttribute(name) { attributes.delete(name) }
  }
  return element
}

const installFakeDocument = (t) => {
  __resetDialogLayersForTests()
  const document = createFakeDocument()
  globalThis.document = document
  t.after(() => {
    __resetDialogLayersForTests()
    delete globalThis.document
  })
  return document
}

const mountLifecycle = async ({ document, requestClose, focusables = [] }) => {
  const open = ref(true)
  const dialog = createFakeElement(document, { focusables })
  const dialogRef = shallowRef(dialog)
  let lifecycle
  const app = renderer.createApp({
    setup() {
      lifecycle = useDialogLifecycle({ open, dialogRef, requestClose })
      return () => h('div')
    }
  })

  document.body.children.push(dialog)
  app.mount({ children: [] })
  await flushLifecycle()
  lifecycle.onAfterEnter()
  return { app, dialog, lifecycle, open }
}

const keyEvent = (key, shiftKey = false) => ({
  type: 'keydown',
  key,
  shiftKey,
  defaultPrevented: false,
  preventDefault() { this.defaultPrevented = true }
})

test('dialog layers only expose the most recently registered layer as topmost', () => {
  __resetDialogLayersForTests()
  const first = registerDialogLayer({ setAttribute() {}, removeAttribute() {} })
  const second = registerDialogLayer({ setAttribute() {}, removeAttribute() {} })
  assert.equal(isTopDialogLayer(first), false)
  assert.equal(isTopDialogLayer(second), true)
  unregisterDialogLayer(second)
  assert.equal(isTopDialogLayer(first), true)
})

test('focus candidates exclude disabled, hidden, and negative-tabindex controls', () => {
  const enabled = { disabled: false, hidden: false, tabIndex: 0, getAttribute: () => null }
  const disabled = { ...enabled, disabled: true }
  const hidden = { ...enabled, hidden: true }
  const negative = { ...enabled, tabIndex: -1 }
  const root = { querySelectorAll: () => [enabled, disabled, hidden, negative] }
  assert.deepEqual(getFocusableElements(root), [enabled])
})

test('keeps the closing phase and original trigger when reopened before leave completes', async (t) => {
  const document = installFakeDocument(t)
  const trigger = createFakeElement(document, { focusable: true })
  const alternateTrigger = createFakeElement(document, { focusable: true })
  document.activeElement = trigger
  const { lifecycle, open } = await mountLifecycle({ document })

  open.value = false
  await flushLifecycle()
  assert.equal(lifecycle.phase.value, 'closing')

  document.activeElement = alternateTrigger
  open.value = true
  await flushLifecycle()
  assert.equal(lifecycle.phase.value, 'closing')

  lifecycle.onAfterLeave()
  assert.equal(document.activeElement, trigger)
  assert.equal(lifecycle.phase.value, 'opening')
})

test('defers layer cleanup, scroll unlock, and focus return until leave completes', async (t) => {
  const document = installFakeDocument(t)
  const trigger = createFakeElement(document, { focusable: true })
  const background = createFakeElement(document)
  document.body.children.push(background)
  document.activeElement = trigger
  const { lifecycle, open } = await mountLifecycle({ document })

  assert.equal(document.body.style.overflow, 'hidden')
  assert.equal(document.documentElement.style.overflow, 'hidden')
  assert.equal(background.inert, true)
  open.value = false
  await flushLifecycle()

  assert.equal(lifecycle.rendered.value, true)
  assert.equal(lifecycle.phase.value, 'closing')
  assert.equal(document.body.style.overflow, 'hidden')
  assert.equal(background.inert, true)

  lifecycle.onAfterLeave()
  assert.equal(lifecycle.rendered.value, false)
  assert.equal(lifecycle.phase.value, 'closed')
  assert.equal(document.body.style.overflow, '')
  assert.equal(document.documentElement.style.overflow, '')
  assert.equal(background.inert, false)
  assert.equal(document.activeElement, trigger)
})

test('limits keyboard controls to the top layer and retains nested isolation until every layer closes', async (t) => {
  const document = installFakeDocument(t)
  const background = createFakeElement(document)
  const firstTrigger = createFakeElement(document, { focusable: true })
  const secondFirst = createFakeElement(document, { focusable: true })
  const secondLast = createFakeElement(document, { focusable: true })
  document.body.children.push(background)
  document.activeElement = firstTrigger
  let firstCloseCount = 0
  let secondCloseCount = 0
  const first = await mountLifecycle({
    document,
    requestClose: () => { firstCloseCount += 1 }
  })
  const second = await mountLifecycle({
    document,
    requestClose: () => { secondCloseCount += 1 },
    focusables: [secondFirst, secondLast]
  })

  assert.equal(background.inert, true)
  assert.equal(first.dialog.inert, true)
  assert.equal(first.dialog.getAttribute('aria-hidden'), 'true')
  assert.equal(second.dialog.inert, false)

  document.activeElement = secondLast
  const tab = keyEvent('Tab')
  document.dispatch(tab)
  assert.equal(tab.defaultPrevented, true)
  assert.equal(document.activeElement, secondFirst)

  const escape = keyEvent('Escape')
  document.dispatch(escape)
  assert.equal(escape.defaultPrevented, true)
  assert.equal(firstCloseCount, 0)
  assert.equal(secondCloseCount, 1)
  assert.equal(first.lifecycle.phase.value, 'open')
  assert.equal(second.lifecycle.phase.value, 'closing')

  second.open.value = false
  await flushLifecycle()
  second.lifecycle.onAfterLeave()
  assert.equal(document.body.style.overflow, 'hidden')
  assert.equal(background.inert, true)
  assert.equal(first.dialog.inert, false)

  first.open.value = false
  await flushLifecycle()
  first.lifecycle.onAfterLeave()
  assert.equal(document.body.style.overflow, '')
  assert.equal(background.inert, false)
})

test('unmount releases the dialog layer, document listener, scroll lock, and focus', async (t) => {
  const document = installFakeDocument(t)
  const trigger = createFakeElement(document, { focusable: true })
  const background = createFakeElement(document)
  document.body.children.push(background)
  document.activeElement = trigger
  const { app } = await mountLifecycle({ document })

  assert.equal(document.listenerCount('keydown'), 1)
  app.unmount()
  assert.equal(document.listenerCount('keydown'), 0)
  assert.equal(document.body.style.overflow, '')
  assert.equal(background.inert, false)
  assert.equal(document.activeElement, trigger)
})
