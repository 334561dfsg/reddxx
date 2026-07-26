import { existsSync, readFileSync } from 'node:fs'
import { dirname, extname, resolve } from 'node:path'
import { pathToFileURL } from 'node:url'
import { compileScript, parse } from '@vue/compiler-sfc'
import { createRenderer, h, nextTick, reactive } from 'vue'

const stubComponentUrl = 'data:text/javascript;base64,' + Buffer.from(
  'export default { name: "SfcHarnessStub", render() { return null } }'
).toString('base64')

const resolveImport = (specifier, filename, vueImports) => {
  if (!specifier.startsWith('.')) return import.meta.resolve(specifier)

  const resolved = resolve(dirname(filename), specifier)
  if (extname(resolved) === '.vue') return vueImports[resolved] || stubComponentUrl
  if (!extname(resolved) && existsSync(`${resolved}.js`)) {
    return pathToFileURL(`${resolved}.js`).href
  }
  return pathToFileURL(resolved).href
}

export const loadVueSfcModuleUrl = (filename, { vueImports = {} } = {}) => {
  const absoluteFilename = resolve(filename)
  const source = readFileSync(absoluteFilename, 'utf8')
  const { descriptor, errors } = parse(source, { filename: absoluteFilename })
  if (errors.length) throw errors[0]

  let code = compileScript(descriptor, {
    id: `sfc-harness-${Buffer.from(absoluteFilename).toString('hex')}`,
    inlineTemplate: true
  }).content

  code = code.replace(
    /(from\s+)(['"])([^'"]+)(\2)/g,
    (_, prefix, quote, specifier) => `${prefix}${quote}${resolveImport(specifier, absoluteFilename, vueImports)}${quote}`
  )

  return `data:text/javascript;base64,${Buffer.from(code).toString('base64')}`
}

export const loadVueSfc = async (filename, options) => {
  return (await import(loadVueSfcModuleUrl(filename, options))).default
}

const walk = (node, visit) => {
  visit(node)
  for (const child of node.children || []) walk(child, visit)
}

const createEventTarget = (initial = {}) => {
  const listeners = new Map()
  return {
    ...initial,
    addEventListener(type, listener) {
      const handlers = listeners.get(type) || new Set()
      handlers.add(listener)
      listeners.set(type, handlers)
    },
    removeEventListener(type, listener) {
      listeners.get(type)?.delete(listener)
    },
    dispatchEvent(event) {
      event.target ||= this
      for (const listener of [...(listeners.get(event.type) || [])]) listener(event)
      return !event.defaultPrevented
    },
    listenerCount(type) {
      return listeners.get(type)?.size || 0
    }
  }
}

const createHostNode = (document, tag, { connectedRoot = false } = {}) => {
  const attributes = new Map()
  const listeners = new Map()
  const classes = new Set()
  const node = {
    tag,
    tagName: tag.toUpperCase(),
    children: [],
    parent: null,
    ownerDocument: document,
    style: {},
    disabled: false,
    hidden: false,
    _inert: false,
    multiple: false,
    selected: false,
    selectedIndex: -1,
    tabIndex: ['button', 'input', 'select', 'textarea', 'a'].includes(tag) ? 0 : -1,
    _connectedRoot: connectedRoot,
    classList: {
      add(...names) {
        names.forEach((name) => classes.add(name))
      },
      remove(...names) {
        names.forEach((name) => classes.delete(name))
      },
      contains(name) {
        return classes.has(name)
      },
      values() {
        return classes.values()
      }
    },
    appendChild(child) {
      if (child.parent) child.parent.removeChild?.(child)
      child.parent = node
      node.children.push(child)
      return child
    },
    removeChild(child) {
      const index = node.children.indexOf(child)
      if (index >= 0) node.children.splice(index, 1)
      document.eventLog?.push({ type: 'dom-remove', node: child })
      child.parent = null
      return child
    },
    remove() {
      node.parent?.removeChild?.(node)
    },
    addEventListener(type, listener) {
      const handlers = listeners.get(type) || new Set()
      handlers.add(listener)
      listeners.set(type, handlers)
    },
    removeEventListener(type, listener) {
      listeners.get(type)?.delete(listener)
    },
    getEventListeners(type) {
      return [...(listeners.get(type) || [])]
    },
    dispatchEvent(event) {
      event.target ||= node
      event.currentTarget = node
      for (const listener of [...(listeners.get(event.type) || [])]) listener(event)
      if (
        event.type === 'keydown' &&
        !event.defaultPrevented &&
        node.tag === 'input' &&
        node.getAttribute('type') === 'radio' &&
        ['ArrowDown', 'ArrowRight', 'ArrowUp', 'ArrowLeft'].includes(event.key)
      ) {
        const groupName = node.getAttribute('name')
        const radios = []
        walk(document.body, (candidate) => {
          if (
            candidate.tag === 'input' &&
            candidate.getAttribute?.('type') === 'radio' &&
            candidate.getAttribute('name') === groupName &&
            !candidate.disabled
          ) radios.push(candidate)
        })
        const direction = ['ArrowDown', 'ArrowRight'].includes(event.key) ? 1 : -1
        const next = radios[(radios.indexOf(node) + direction + radios.length) % radios.length]
        if (next) {
          next.checked = true
          next.focus()
          next.dispatchEvent({
            type: 'change',
            target: next,
            currentTarget: next,
            defaultPrevented: false,
            preventDefault() { this.defaultPrevented = true }
          })
        }
      }
      return !event.defaultPrevented
    },
    click() {
      if (node.disabled) return
      node.dispatchEvent({
        type: 'click',
        target: node,
        currentTarget: node,
        defaultPrevented: false,
        propagationStopped: false,
        preventDefault() { this.defaultPrevented = true },
        stopPropagation() { this.propagationStopped = true }
      })
    },
    focus() {
      if (node.disabled || !node.isConnected) return
      document.eventLog?.push({ type: 'focus', node })
      document.activeElement = node
    },
    contains(target) {
      if (target === node) return true
      let found = false
      walk(node, (candidate) => {
        if (candidate === target) found = true
      })
      return found
    },
    querySelectorAll() {
      const candidates = []
      walk(node, (candidate) => {
        if (candidate !== node && candidate.tabIndex >= 0) candidates.push(candidate)
      })
      return candidates
    },
    getAttribute(name) {
      if (name === 'class') return [...classes].join(' ')
      return attributes.get(name) ?? null
    },
    hasAttribute(name) {
      if (name === 'class') return classes.size > 0
      return attributes.has(name)
    },
    setAttribute(name, value) {
      if (name === 'class') {
        classes.clear()
        String(value).split(/\s+/).filter(Boolean).forEach((item) => classes.add(item))
        return
      }
      attributes.set(name, String(value))
    },
    removeAttribute(name) {
      if (name === 'class') classes.clear()
      else attributes.delete(name)
    }
  }

  Object.defineProperties(node, {
    inert: {
      get() { return node._inert },
      set(value) {
        node._inert = Boolean(value)
        document.eventLog?.push({ type: 'inert', node, value: Boolean(value) })
      }
    },
    options: {
      get() {
        if (node.tag !== 'select') return undefined
        const options = []
        walk(node, (candidate) => {
          if (candidate.tag === 'option') options.push(candidate)
        })
        return options
      }
    },
    isConnected: {
      get() {
        let current = node
        while (current) {
          if (current._connectedRoot) return true
          current = current.parent
        }
        return false
      }
    },
    textContent: {
      get() {
        if (node.text != null) return String(node.text)
        return (node.children || []).map((child) => child.textContent ?? child.text ?? '').join('')
      },
      set(value) {
        node.text = String(value)
        node.children = []
      }
    }
  })

  return node
}

const createDocument = () => {
  const listeners = new Map()
  const document = {
    activeElement: null,
    body: null,
    eventLog: [],
    documentElement: { style: { overflow: '' } },
    addEventListener(type, listener) {
      const handlers = listeners.get(type) || new Set()
      handlers.add(listener)
      listeners.set(type, handlers)
    },
    removeEventListener(type, listener) {
      listeners.get(type)?.delete(listener)
      document.eventLog.push({ type: 'listener-removed', listenerType: type })
    },
    dispatchEvent(event) {
      event.target ||= document
      for (const listener of [...(listeners.get(event.type) || [])]) listener(event)
      return !event.defaultPrevented
    },
    querySelector(selector) {
      if (selector === 'body') return document.body
      return null
    },
    createElement(tag) {
      return createHostNode(document, tag)
    },
    getElementById(id) {
      let match = null
      walk(document.body, (candidate) => {
        if (!match && candidate.getAttribute?.('id') === id) match = candidate
      })
      return match
    },
    listenerCount(type) {
      return listeners.get(type)?.size || 0
    }
  }
  document.body = createHostNode(document, 'body', { connectedRoot: true })
  let bodyOverflow = ''
  let documentOverflow = ''
  Object.defineProperty(document.body.style, 'overflow', {
    configurable: true,
    enumerable: true,
    get: () => bodyOverflow,
    set(value) {
      bodyOverflow = value
      document.eventLog.push({ type: 'scroll-lock', target: 'body', value })
    }
  })
  Object.defineProperty(document.documentElement.style, 'overflow', {
    configurable: true,
    enumerable: true,
    get: () => documentOverflow,
    set(value) {
      documentOverflow = value
      document.eventLog.push({ type: 'scroll-lock', target: 'document', value })
    }
  })
  document.body.offsetHeight = 900
  return document
}

const createHostRenderer = (document) => createRenderer({
  patchProp(node, key, previous, next) {
    if (key === 'class') {
      const transitionClasses = [...node.classList.values()].filter((name) => (
        /-(?:enter|leave|appear)-(?:from|active|to)$/.test(name)
      ))
      node.setAttribute('class', next || '')
      transitionClasses.forEach((name) => node.classList.add(name))
      return
    }
    if (key === 'style') {
      if (typeof next === 'string') node.style.cssText = next
      else Object.assign(node.style, next || {})
      return
    }
    if (/^on[A-Z]/.test(key)) {
      const type = key.slice(2).toLowerCase()
      if (previous) node.removeEventListener(type, previous)
      if (next) {
        const handlers = Array.isArray(next) ? next : [next]
        handlers.forEach((handler) => node.addEventListener(type, handler))
      }
      return
    }
    if (key === 'value' || key === 'checked' || key === 'disabled' || key === 'hidden' || key === 'tabIndex') {
      node[key] = next
    }
    if (next == null || next === false) node.removeAttribute(key)
    else node.setAttribute(key, next === true ? '' : next)
  },
  insert(child, parent, anchor) {
    child.parent = parent
    const index = anchor ? parent.children.indexOf(anchor) : -1
    if (index >= 0) parent.children.splice(index, 0, child)
    else parent.children.push(child)
  },
  remove(child) {
    document.eventLog.push({ type: 'dom-remove', node: child })
    const siblings = child.parent?.children || []
    const index = siblings.indexOf(child)
    if (index >= 0) siblings.splice(index, 1)
    child.parent = null
  },
  createElement(tag) {
    return createHostNode(document, tag)
  },
  createText(text) {
    const node = createHostNode(document, '#text')
    node.text = text
    return node
  },
  createComment() {
    const node = createHostNode(document, '#comment')
    node.text = ''
    return node
  },
  setText(node, text) {
    node.text = text
  },
  setElementText(node, text) {
    node.textContent = text
  },
  parentNode: (node) => node.parent || null,
  nextSibling(node) {
    const siblings = node.parent?.children || []
    return siblings[siblings.indexOf(node) + 1] || null
  },
  querySelector(selector) {
    return document.querySelector(selector)
  },
  setScopeId(node, id) {
    node.setAttribute(id, '')
  },
  cloneNode(node) {
    return { ...node, children: [...node.children] }
  },
  insertStaticContent(content, parent, anchor) {
    const node = createHostNode(document, '#static')
    node.text = content
    node.parent = parent
    const index = anchor ? parent.children.indexOf(anchor) : -1
    if (index >= 0) parent.children.splice(index, 0, node)
    else parent.children.push(node)
    return [node, node]
  }
})

const flushVue = async () => {
  await nextTick()
  await nextTick()
}

export const createSfcHarness = async (component, initialProps = {}, listeners = {}, environment = {}) => {
  const previousGlobals = {
    document: globalThis.document,
    window: globalThis.window,
    requestAnimationFrame: globalThis.requestAnimationFrame,
    cancelAnimationFrame: globalThis.cancelAnimationFrame
  }
  const document = createDocument()
  const animationFrames = new Map()
  let animationFrameSequence = 0
  globalThis.document = document
  const visualViewport = environment.visualViewport
    ? createEventTarget(environment.visualViewport)
    : undefined
  const harnessWindow = createEventTarget({
    innerWidth: environment.innerWidth,
    innerHeight: environment.innerHeight,
    visualViewport,
    getComputedStyle: () => ({
      transitionDelay: '0s',
      transitionDuration: '0.001s',
      transitionProperty: 'all',
      animationDelay: '0s',
      animationDuration: '0s',
      animationName: 'none'
    }),
    ...environment.window
  })
  globalThis.window = harnessWindow
  globalThis.requestAnimationFrame = (callback) => {
    animationFrameSequence += 1
    animationFrames.set(animationFrameSequence, callback)
    return animationFrameSequence
  }
  globalThis.cancelAnimationFrame = (id) => {
    if (animationFrames.delete(id)) {
      document.eventLog.push({ type: 'animation-frame-cancelled', id })
    }
  }

  const renderer = createHostRenderer(document)
  const root = createHostNode(document, 'main', { connectedRoot: true })
  document.body.children.push(root)
  root.parent = document.body
  const props = reactive({ ...initialProps })
  const emitted = []
  const app = renderer.createApp({
    setup() {
      const eventListeners = Object.fromEntries(Object.entries(listeners).map(([name, handler]) => [
        name,
        (...args) => {
          emitted.push([name, ...args])
          handler?.(...args)
        }
      ]))
      return () => h(component, { ...props, ...eventListeners })
    }
  })
  app.component('RouterLink', {
    name: 'RouterLink',
    render() {
      return h('a', this.$attrs, this.$slots.default?.())
    }
  })
  app.mount(root)
  await flushVue()

  const allNodes = () => {
    const nodes = []
    walk(document.body, (node) => nodes.push(node))
    return nodes
  }
  const findByTestId = (testId) => allNodes().find((node) => node.getAttribute?.('data-testid') === testId)
  const findByText = (text, tag) => allNodes().find((node) => (
    (!tag || node.tag === tag) && node.textContent.trim() === text
  ))
  const keydown = (key, shiftKey = false) => {
    const event = {
      type: 'keydown',
      key,
      shiftKey,
      defaultPrevented: false,
      preventDefault() { this.defaultPrevented = true }
    }
    document.dispatchEvent(event)
    return event
  }
  const finishTransitions = async () => {
    for (let pass = 0; pass < 2; pass += 1) {
      const callbacks = [...animationFrames.values()]
      animationFrames.clear()
      callbacks.forEach((callback) => callback())
    }
    await new Promise((resolvePromise) => setTimeout(resolvePromise, 5))
    await flushVue()
  }
  let cleanedUp = false
  const cleanup = () => {
    if (cleanedUp) return
    cleanedUp = true
    app.unmount()
    globalThis.document = previousGlobals.document
    globalThis.window = previousGlobals.window
    globalThis.requestAnimationFrame = previousGlobals.requestAnimationFrame
    globalThis.cancelAnimationFrame = previousGlobals.cancelAnimationFrame
  }

  return {
    allNodes,
    app,
    cleanup,
    document,
    emitted,
    findByTestId,
    findByText,
    finishTransitions,
    flush: flushVue,
    keydown,
    pendingAnimationFrameCount: () => animationFrames.size,
    props,
    root,
    window: harnessWindow
  }
}
