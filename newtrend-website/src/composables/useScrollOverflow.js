import {onBeforeUnmount, shallowRef, watch} from 'vue'

// One-row strips that may be wider than their box (pair-list category tabs, instrument-bar 24h stats): `more` is true
// while content is hidden past the right edge, so the caller can fade that edge, and `onWheel` turns a vertical mouse
// wheel into sideways scrolling (touchpads and touch scroll natively; keyboard focus scrolls a control into view).
// Re-measures on scroll and whenever the strip or one of its children changes size; `enabled` switches it off (e.g.
// on layouts where the strip wraps instead). Bind: ref="el" :class="{'has-more':more}" @scroll.passive="update" @wheel="onWheel".
export function useScrollOverflow(el, {enabled = () => true} = {}) {
  const more = shallowRef(false)
  const update = () => {
    const node = el.value
    more.value = Boolean(node && enabled() && node.scrollLeft + node.clientWidth < node.scrollWidth - 1)
  }
  function onWheel(event) {
    const node = el.value
    if (!node || !enabled() || node.scrollWidth <= node.clientWidth || Math.abs(event.deltaX) >= Math.abs(event.deltaY)) return
    event.preventDefault()
    node.scrollLeft += event.deltaY
    update()
  }

  let resize = null, children = null
  const disconnect = () => { resize?.disconnect(); children?.disconnect(); resize = children = null }
  function observe(node) {
    disconnect()
    if (!node || typeof ResizeObserver !== 'function') return update()
    resize = new ResizeObserver(update)
    const watchAll = () => { resize.disconnect(); resize.observe(node); for (const child of node.children) resize.observe(child) }
    watchAll()
    // Children come and go with the data (category list, skeleton → values); observe the new ones too.
    if (typeof MutationObserver === 'function') { children = new MutationObserver(() => { watchAll(); update() }); children.observe(node, {childList: true}) }
    update()
  }
  watch(el, observe, {flush: 'post', immediate: true})
  watch(enabled, update)
  onBeforeUnmount(disconnect)
  return {more, update, onWheel}
}
