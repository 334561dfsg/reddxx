// Test stand-in for ant-design-vue's Drawer/Button used through src/admin/components/antd/AdminDrawer.vue. It keeps the
// parts the adapter relies on: the content element (.ant-drawer-content) holding the title, body and footer slots,
// staying rendered while closing, and afterOpenChange fired from an animation frame (harness.finishTransitions()).
import { defineComponent, h, ref, watch } from 'vue'

export const Drawer = defineComponent({
  name: 'ADrawerStub',
  inheritAttrs: false,
  props: { open: Boolean, rootClassName: String, zIndex: Number },
  emits: ['afterOpenChange', 'close'],
  setup(props, { slots, emit }) {
    const rendered = ref(props.open)
    const settle = (open) => requestAnimationFrame(() => {
      if (!open && !props.open) rendered.value = false // a reopen during the close keeps it rendered, as Ant does
      emit('afterOpenChange', open)
    })
    if (props.open) settle(true)
    watch(() => props.open, (open) => {
      if (open) rendered.value = true
      settle(open)
    })
    return () => rendered.value
      ? h('div', { class: ['ant-drawer', props.rootClassName, props.open && 'ant-drawer-open'] }, [
        h('div', { class: 'ant-drawer-content' }, [
          h('div', { class: 'ant-drawer-header' }, slots.title?.()),
          h('div', { class: 'ant-drawer-body' }, slots.default?.()),
          slots.footer ? h('div', { class: 'ant-drawer-footer' }, slots.footer()) : null
        ])
      ])
      : null
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
