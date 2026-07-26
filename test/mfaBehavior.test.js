import test from 'node:test'
import assert from 'node:assert/strict'
import { createRenderer, h, nextTick, reactive } from 'vue'
import { __resetDialogLayersForTests } from '../src/admin/composables/useDialogLifecycle.js'
import { useMfaVerification } from '../src/admin/composables/useMfaVerification.js'
import { useMfaActionFlow } from '../src/admin/composables/useMfaActionFlow.js'

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

const flush = async () => {
  await nextTick()
  await nextTick()
}

const createFakeDocument = () => {
  const listeners = new Map()
  return {
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
    }
  }
}

const createFakeElement = (document, { focusable = false, focusables = [] } = {}) => {
  const attributes = new Map()
  const element = {
    disabled: false,
    hidden: false,
    inert: false,
    tabIndex: focusable ? 0 : -1,
    focusCount: 0,
    focus() {
      this.focusCount += 1
      document.activeElement = element
    },
    querySelectorAll: () => focusables,
    contains(target) { return target === element || focusables.includes(target) },
    getAttribute(name) { return attributes.get(name) ?? null },
    hasAttribute(name) { return attributes.has(name) },
    setAttribute(name, value) { attributes.set(name, String(value)) },
    removeAttribute(name) { attributes.delete(name) }
  }
  return element
}

const keyEvent = (key) => ({
  type: 'keydown',
  key,
  shiftKey: false,
  defaultPrevented: false,
  preventDefault() { this.defaultPrevented = true }
})

const mountMfa = async (t, overrides = {}) => {
  __resetDialogLayersForTests()
  const document = createFakeDocument()
  globalThis.document = document
  t.after(() => {
    __resetDialogLayersForTests()
    delete globalThis.document
  })

  const input = createFakeElement(document, { focusable: true })
  const cancel = createFakeElement(document, { focusable: true })
  const verify = createFakeElement(document, { focusable: true })
  const error = createFakeElement(document)
  const dialog = createFakeElement(document, { focusables: [input, cancel, verify] })
  const props = reactive({
    open: true,
    title: '安全验证',
    description: '请输入验证码',
    loading: false,
    error: '',
    errorAttempt: 0,
    ...overrides
  })
  const emitted = []
  let controller
  const app = renderer.createApp({
    setup() {
      controller = useMfaVerification(props, (name, ...args) => emitted.push([name, ...args]))
      controller.dialogRef.value = dialog
      controller.verificationInput.value = input
      controller.errorSummary.value = error
      return () => h('div')
    }
  })

  document.body.children.push(dialog)
  app.mount({ children: [] })
  await flush()
  controller.onAfterEnter()
  t.after(() => app.unmount())
  return { app, cancel, controller, dialog, document, emitted, error, input, props, verify }
}

const mountActionFlow = (t, options) => {
  let flow
  const app = renderer.createApp({
    setup() {
      flow = useMfaActionFlow(options)
      return () => h('div')
    }
  })
  app.mount({ children: [] })
  t.after(() => app.unmount())
  return flow
}

test('MFA dialog focuses its verification input when the real lifecycle opens', async (t) => {
  const { document, input } = await mountMfa(t)
  assert.equal(document.activeElement, input)
  assert.equal(input.focusCount, 1)
})

test('MFA local and repeated identical external errors focus the real error summary', async (t) => {
  const { controller, document, error, input, props } = await mountMfa(t)

  controller.verificationCode.value = ''
  await controller.handleVerify()
  assert.equal(controller.errorMessage.value, '请输入验证码')
  assert.equal(document.activeElement, error)

  controller.verificationCode.value = '123456'
  props.error = '验证码无效'
  props.errorAttempt += 1
  await flush()
  assert.equal(document.activeElement, error)
  const firstFailureFocusCount = error.focusCount

  input.focus()
  props.errorAttempt += 1
  await flush()
  assert.equal(props.error, '验证码无效')
  assert.equal(document.activeElement, error)
  assert.equal(error.focusCount, firstFailureFocusCount + 1)
})

test('MFA local validation replaces a stale external failure until a valid retry receives a new result', async (t) => {
  const { controller, document, emitted, error, input, props } = await mountMfa(t)

  props.error = '验证码无效'
  props.errorAttempt = 1
  await flush()
  assert.equal(controller.errorMessage.value, '验证码无效')

  input.focus()
  controller.verificationCode.value = ''
  assert.equal(await controller.handleVerify(), false)
  assert.equal(controller.errorMessage.value, '请输入验证码')
  assert.equal(document.activeElement, error)

  input.focus()
  controller.verificationCode.value = '12345'
  assert.equal(await controller.handleVerify(), false)
  assert.equal(controller.errorMessage.value, '验证码必须是 6 位数字')
  assert.equal(document.activeElement, error)

  controller.verificationCode.value = '654321'
  assert.equal(await controller.handleVerify(), true)
  assert.equal(controller.localError.value, '')
  assert.deepEqual(emitted, [['verify', '654321']])

  props.error = '验证码已过期'
  props.errorAttempt = 2
  await flush()
  assert.equal(controller.errorMessage.value, '验证码已过期')
  assert.equal(document.activeElement, error)
})

test('MFA request state blocks verify, cancel, header close, Escape, and callbacks', async (t) => {
  const { controller, document, emitted } = await mountMfa(t)
  controller.verificationCode.value = '123456'

  await controller.handleVerify()
  await controller.handleVerify()
  controller.handleCancel()
  controller.close()
  const escape = keyEvent('Escape')
  document.dispatch(escape)

  assert.deepEqual(emitted, [['verify', '123456']])
  assert.equal(controller.phase.value, 'open')
  assert.equal(escape.defaultPrevented, false)
})

test('MFA loading state blocks verify and every close path', async (t) => {
  const { controller, document, emitted, props } = await mountMfa(t)
  props.loading = true
  controller.verificationCode.value = '123456'
  await flush()

  await controller.handleVerify()
  controller.handleCancel()
  controller.close()
  document.dispatch(keyEvent('Escape'))

  assert.deepEqual(emitted, [])
  assert.equal(controller.requestDialogClose(), false)
  assert.equal(controller.phase.value, 'open')
})

test('MFA header close and footer cancel share one guarded callback path', async (t) => {
  const first = await mountMfa(t)
  first.controller.close()
  first.controller.handleCancel()
  assert.deepEqual(first.emitted, [['cancel'], ['update:open', false]])
  assert.equal(first.controller.phase.value, 'closing')
})

test('MFA keeps visible loading, error, request and title state stable until leave completes', async (t) => {
  const { controller, props } = await mountMfa(t)
  props.loading = true
  props.error = '验证失败'
  props.errorAttempt = 1
  await flush()
  const openState = { ...controller.displayedDialog.value }

  props.open = false
  props.loading = false
  props.error = ''
  await flush()

  assert.equal(controller.phase.value, 'closing')
  assert.deepEqual(controller.displayedDialog.value, openState)
  await controller.onAfterLeave()
  assert.equal(controller.rendered.value, false)
  assert.equal(controller.displayedDialog.value.loading, false)
  assert.equal(controller.displayedDialog.value.errorMessage, '')
})

for (const [label, makeExecute] of [
  ['synchronous', () => () => { throw new Error('验证码无效') }],
  ['asynchronous', () => async () => { throw new Error('验证码无效') }]
]) {
  test(`parent MFA flow preserves pending action and retries the same ${label} error`, async (t) => {
    let calls = 0
    const execute = makeExecute()
    const flow = mountActionFlow(t, {
      execute: (...args) => {
        calls += 1
        return execute(...args)
      }
    })
    const action = { type: 'apply', payload: { userId: '159' } }
    flow.request(action)

    assert.equal(await flow.verify('123456'), false)
    assert.equal(flow.open.value, true)
    assert.deepEqual(flow.pendingAction.value, action)
    assert.equal(flow.error.value, '验证失败：验证码无效')
    assert.equal(flow.errorAttempt.value, 1)

    assert.equal(await flow.verify('123456'), false)
    assert.deepEqual(flow.pendingAction.value, action)
    assert.equal(flow.error.value, '验证失败：验证码无效')
    assert.equal(flow.errorAttempt.value, 2)
    assert.equal(calls, 2)
  })
}

test('parent MFA flow deduplicates async execution and preserves state until success', async (t) => {
  let resolveExecution
  let calls = 0
  let successCount = 0
  const flow = mountActionFlow(t, {
    execute: () => {
      calls += 1
      return new Promise((resolve) => { resolveExecution = resolve })
    },
    onSuccess: () => { successCount += 1 }
  })
  const action = { type: 'cancel', payload: { userId: '159' } }
  flow.request(action)

  const verification = flow.verify('123456')
  assert.equal(flow.loading.value, true)
  assert.deepEqual(flow.pendingAction.value, action)
  assert.equal(await flow.verify('123456'), false)
  assert.equal(flow.cancel(), false)
  assert.equal(calls, 1)

  resolveExecution()
  assert.equal(await verification, true)
  assert.equal(flow.open.value, false)
  assert.equal(flow.pendingAction.value, null)
  assert.equal(flow.error.value, '')
  assert.equal(flow.loading.value, false)
  assert.equal(successCount, 1)
})
