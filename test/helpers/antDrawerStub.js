// Test stand-in for ant-design-vue's Drawer/Button used through src/admin/components/antd/AdminDrawer.vue. It keeps the
// parts the adapter relies on: the content element (.ant-drawer-content) holding the title, body and footer slots,
// staying rendered while closing, and afterOpenChange fired from an animation frame (harness.finishTransitions()).
import { Teleport, defineComponent, h, nextTick, ref, watch } from 'vue'

export const Drawer = defineComponent({
  name: 'ADrawerStub',
  inheritAttrs: false,
  props: { open: Boolean, rootClassName: String, zIndex: Number },
  emits: ['afterOpenChange', 'close'],
  setup(props, { slots, emit }) {
    const rendered = ref(props.open)
    // Like Ant, the panel is already hidden when afterOpenChange(false) fires: drop it, let the DOM update, then emit.
    const settle = (open) => requestAnimationFrame(async () => {
      if (!open && !props.open) {
        rendered.value = false // a reopen during the close keeps it rendered, as Ant does
        await nextTick()
      }
      emit('afterOpenChange', open)
    })
    if (props.open) settle(true)
    watch(() => props.open, (open) => {
      if (open) rendered.value = true
      settle(open)
    })
    // Ant portals the drawer to <body>; so does the stand-in, so the page root can be made inert underneath.
    return () => h(Teleport, { to: 'body' }, rendered.value
      ? [h('div', { class: ['ant-drawer', props.rootClassName, props.open && 'ant-drawer-open'] }, [
        h('div', { class: 'ant-drawer-content' }, [
          h('div', { class: 'ant-drawer-header' }, slots.title?.()),
          h('div', { class: 'ant-drawer-body' }, slots.default?.()),
          slots.footer ? h('div', { class: 'ant-drawer-footer' }, slots.footer()) : null
        ])
      ])]
      : [])
  }
})

export const Button = defineComponent({
  name: 'AButtonStub',
  inheritAttrs: false,
  props: { disabled: Boolean, type: String },
  setup(props, { slots, attrs }) {
    return () => h('button', { ...attrs, type: 'button', disabled: props.disabled }, slots.default?.())
  }
})

export const CloseOutlined = defineComponent({ name: 'CloseOutlinedStub', render: () => h('span', { 'aria-hidden': 'true' }, '×') })

// Stand-in for ant-design-vue's Modal as used by src/admin/components/antd/AdminDialog.vue: portalled to <body>, the
// full-screen wrap carries role="dialog", the panel holds modalRender(content), and afterClose fires from an animation
// frame once the panel is gone (harness.finishTransitions()).
export const Modal = defineComponent({
  name: 'AModalStub',
  inheritAttrs: false,
  // afterClose is a function prop, exactly as in ant-design-vue (a listener would never be called there either).
  props: { open: Boolean, wrapClassName: String, zIndex: Number, afterClose: Function },
  setup(props, { slots }) {
    const rendered = ref(props.open)
    watch(() => props.open, (open) => {
      if (open) { rendered.value = true; return }
      requestAnimationFrame(async () => {
        if (props.open) return
        rendered.value = false
        await nextTick()
        props.afterClose?.()
      })
    })
    return () => h(Teleport, { to: 'body' }, rendered.value
      ? [h('div', { class: 'ant-modal-root' }, [
        h('div', { class: ['ant-modal-wrap', props.wrapClassName], role: 'dialog' }, [
          h('div', { class: 'ant-modal', role: 'document' }, [
            (() => {
              const content = h('div', { class: 'ant-modal-content' }, [
                h('div', { class: 'ant-modal-header' }, slots.title?.()),
                h('div', { class: 'ant-modal-body' }, slots.default?.())
              ])
              return slots.modalRender ? slots.modalRender({ originVNode: content }) : content
            })()
          ])
        ])
      ])]
      : [])
  }
})

// Stand-in for ant-design-vue's imperative message API: records each notice so tests can assert feedback.
export const messageCalls = []
export const message = Object.fromEntries(['success', 'error', 'info', 'warning'].map((type) => [type, (content) => { messageCalls.push({ type, content }) }]))

// Stand-in for ant-design-vue's Empty (used by AdminEmpty.vue): renders the description slot as text.
export const Empty = Object.assign(defineComponent({
  name: 'AEmptyStub',
  inheritAttrs: false,
  setup(_, { slots, attrs }) {
    return () => h('div', { ...attrs, class: ['ant-empty', attrs.class] }, slots.description?.())
  }
}), { PRESENTED_IMAGE_SIMPLE: 'simple' })
