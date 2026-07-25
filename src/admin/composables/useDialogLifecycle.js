import { computed, nextTick, onBeforeUnmount, ref, unref, watch } from 'vue'

const dialogLayers = []
const layerVersion = ref(0)
const isolatedBackgrounds = new Map()
let scrollLockState = null

const setElementInert = (element, inert) => {
  if (!element) return

  if (inert) {
    element.inert = true
    element.setAttribute?.('inert', '')
    element.setAttribute?.('aria-hidden', 'true')
    return
  }

  element.inert = false
  element.removeAttribute?.('inert')
  element.removeAttribute?.('aria-hidden')
}

const restoreBackground = (element, state) => {
  element.inert = state.inert
  if (state.hadInert) element.setAttribute?.('inert', '')
  else element.removeAttribute?.('inert')
  if (state.ariaHidden === null) element.removeAttribute?.('aria-hidden')
  else element.setAttribute?.('aria-hidden', state.ariaHidden)
}

const syncScrollLock = () => {
  if (typeof document === 'undefined') return

  if (dialogLayers.length > 0 && !scrollLockState) {
    scrollLockState = {
      bodyOverflow: document.body.style.overflow,
      documentOverflow: document.documentElement.style.overflow
    }
    document.body.style.overflow = 'hidden'
    document.documentElement.style.overflow = 'hidden'
  }

  if (dialogLayers.length === 0 && scrollLockState) {
    document.body.style.overflow = scrollLockState.bodyOverflow
    document.documentElement.style.overflow = scrollLockState.documentOverflow
    scrollLockState = null
  }
}

const syncPageIsolation = () => {
  if (typeof document === 'undefined') return

  if (dialogLayers.length === 0) {
    for (const [element, state] of isolatedBackgrounds) {
      restoreBackground(element, state)
    }
    isolatedBackgrounds.clear()
    return
  }

  const dialogElements = dialogLayers.map(({ element }) => element).filter(Boolean)
  const backgrounds = [...document.body.children].filter((element) => (
    !dialogElements.some((dialog) => element === dialog || element.contains?.(dialog))
  ))

  for (const [element, state] of isolatedBackgrounds) {
    if (!backgrounds.includes(element)) {
      restoreBackground(element, state)
      isolatedBackgrounds.delete(element)
    }
  }

  for (const element of backgrounds) {
    if (!isolatedBackgrounds.has(element)) {
      isolatedBackgrounds.set(element, {
        inert: Boolean(element.inert),
        hadInert: element.hasAttribute?.('inert') ?? false,
        ariaHidden: element.getAttribute?.('aria-hidden') ?? null
      })
    }
    setElementInert(element, dialogLayers.length > 0)
  }
}

const syncLayerIsolation = () => {
  const topLayer = dialogLayers.at(-1)
  for (const layer of dialogLayers) {
    setElementInert(layer.element, layer !== topLayer)
  }
  syncPageIsolation()
  syncScrollLock()
  layerVersion.value += 1
}

export const registerDialogLayer = (element) => {
  const layer = { id: Symbol('dialog-layer'), element }
  dialogLayers.push(layer)
  syncLayerIsolation()
  return layer
}

export const unregisterDialogLayer = (layer) => {
  const index = dialogLayers.indexOf(layer)
  if (index >= 0) dialogLayers.splice(index, 1)
  syncLayerIsolation()
}

export const isTopDialogLayer = (layer) => dialogLayers.at(-1) === layer

export const getFocusableElements = (root) => [...(root?.querySelectorAll(
  'a[href],button,input,select,textarea,[tabindex]:not([tabindex="-1"])'
) || [])].filter((element) => (
  !element.disabled && !element.hidden && element.tabIndex >= 0 &&
  element.getAttribute?.('aria-hidden') !== 'true'
))

export const createDialogCloseAction = (requestClose) => () => requestClose()

export const useDialogContentSnapshot = ({ open, phase, source, clone = (value) => value }) => {
  const snapshot = ref(null)
  const sourceValue = () => unref(source)
  const isOpen = () => Boolean(unref(open))
  const phaseValue = () => unref(phase)

  const capture = () => {
    snapshot.value = clone(sourceValue())
  }

  watch([isOpen, phaseValue, sourceValue], ([nextOpen, nextPhase]) => {
    if (nextOpen && nextPhase !== 'closing') capture()
  }, { immediate: true, deep: true })

  const content = computed(() => (
    unref(phase) === 'closing' && snapshot.value ? snapshot.value : sourceValue()
  ))

  const clear = () => {
    snapshot.value = null
  }

  return { content, clear }
}

export const __resetDialogLayersForTests = () => {
  dialogLayers.splice(0)
  syncLayerIsolation()
}

export const useDialogLifecycle = ({
  open,
  dialogRef,
  initialFocusRef,
  requestClose,
  closeDisabled = false
}) => {
  const rendered = ref(false)
  const phase = ref('closed')
  let layer = null
  let triggerElement = null
  let keydownListener = null

  const isOpen = () => Boolean(unref(open))
  const isCloseDisabled = () => Boolean(unref(closeDisabled))

  const layerStyle = computed(() => {
    layerVersion.value
    const index = dialogLayers.indexOf(layer)
    return index < 0 ? {} : { zIndex: 1000 + index * 10 }
  })

  const restoreFocus = () => {
    triggerElement?.focus?.()
    triggerElement = null
  }

  const removeKeydownListener = () => {
    if (keydownListener && typeof document !== 'undefined') {
      document.removeEventListener('keydown', keydownListener)
    }
    keydownListener = null
  }

  const releaseLayer = () => {
    removeKeydownListener()
    if (layer) unregisterDialogLayer(layer)
    layer = null
  }

  const focusInitialTarget = () => {
    const dialog = dialogRef?.value
    const initialTarget = initialFocusRef?.value
    const target = initialTarget || getFocusableElements(dialog)[0] || dialog
    target?.focus?.()
  }

  const requestDialogClose = () => {
    if (!layer || !isTopDialogLayer(layer) || phase.value !== 'open' || isCloseDisabled()) {
      return false
    }

    phase.value = 'closing'
    requestClose?.()
    return true
  }

  const handleKeydown = (event) => {
    if (!layer || !isTopDialogLayer(layer)) return

    if (event.key === 'Escape') {
      if (requestDialogClose()) event.preventDefault()
      return
    }

    if (event.key !== 'Tab') return
    const dialog = dialogRef?.value
    const focusable = getFocusableElements(dialog)
    if (focusable.length === 0) {
      event.preventDefault()
      dialog?.focus?.()
      return
    }

    const first = focusable[0]
    const last = focusable.at(-1)
    const activeElement = document.activeElement
    if (dialog?.contains?.(activeElement) && !focusable.includes(activeElement)) {
      event.preventDefault()
      const wrapTarget = event.shiftKey ? last : first
      wrapTarget.focus()
    } else if (event.shiftKey && activeElement === first) {
      event.preventDefault()
      last.focus()
    } else if (!event.shiftKey && activeElement === last) {
      event.preventDefault()
      first.focus()
    }
  }

  const registerLayerAfterRender = async () => {
    await nextTick()
    if (!isOpen() || !rendered.value || layer) return

    const dialog = dialogRef?.value
    if (!dialog) return
    layer = registerDialogLayer(dialog)
    keydownListener = handleKeydown
    if (typeof document !== 'undefined') {
      document.addEventListener('keydown', keydownListener)
    }
    focusInitialTarget()
  }

  const startOpening = () => {
    if (phase.value === 'opening' || phase.value === 'open' || phase.value === 'closing') return
    if (typeof document !== 'undefined') triggerElement = document.activeElement
    rendered.value = true
    phase.value = 'opening'
    registerLayerAfterRender()
  }

  const startClosing = () => {
    if (phase.value === 'closed' || phase.value === 'closing') return
    phase.value = 'closing'
  }

  const onAfterEnter = () => {
    if (phase.value === 'opening' && isOpen()) phase.value = 'open'
  }

  const onAfterLeave = () => {
    releaseLayer()
    rendered.value = false
    phase.value = 'closed'
    restoreFocus()
    if (isOpen()) startOpening()
  }

  watch(isOpen, (nextOpen) => {
    if (nextOpen) startOpening()
    else startClosing()
  }, { immediate: true })

  onBeforeUnmount(() => {
    releaseLayer()
    rendered.value = false
    phase.value = 'closed'
    restoreFocus()
  })

  return {
    rendered,
    phase,
    layerStyle,
    requestDialogClose,
    onAfterEnter,
    onAfterLeave
  }
}
