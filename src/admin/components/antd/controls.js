import { defineComponent, h, onBeforeUnmount, Fragment } from 'vue'
import { Button, Input, Select, Checkbox, Radio, Slider } from 'ant-design-vue'
import { registerDialogPopupHost, unregisterDialogPopupHost } from '../../composables/useDialogLifecycle.js'

// Native-form compatibility keeps existing validation and event handlers intact
// while Ant Design owns rendering. Overlay lifecycle continues to own focus.
export const AdminButton = defineComponent({
  name: 'AdminButton',
  inheritAttrs: false,
  setup(_, { attrs, slots }) {
    return () => {
      const classes = String(attrs.class || '')
      const primary = /(?:ant-btn-primary|bg-(?:blue|indigo|emerald|rose|red|amber)-[56]00)/.test(classes)
      return h(Button, {
        ...attrs,
        type: attrs.variant || (primary ? 'primary' : 'default'),
        htmlType: attrs.type || 'button',
        danger: /(?:bg-(?:rose|red)-[56]00|ant-btn-danger)/.test(classes),
        class: [attrs.class, 'admin-antd-control-button']
      }, slots)
    }
  }
})

function createInput(name, component) {
  return defineComponent({
    name,
    inheritAttrs: false,
    props: {
      modelValue: { default: undefined },
      modelModifiers: { default: () => ({}) }
    },
    emits: ['update:modelValue'],
    setup(props, { attrs, emit, slots }) {
      const update = (value) => {
        let result = props.modelModifiers.trim && typeof value === 'string' ? value.trim() : value
        if (props.modelModifiers.number || attrs.type === 'number') {
          const numeric = parseFloat(result)
          if (!Number.isNaN(numeric)) result = numeric
        }
        emit('update:modelValue', result)
      }
      return () => h(component, {
        ...attrs,
        ...(attrs.rows != null ? { rows: Number(attrs.rows) } : {}),
        ...(attrs.maxlength != null ? { maxlength: Number(attrs.maxlength) } : {}),
        ...(props.modelValue !== undefined ? { value: props.modelValue } : {}),
        'onUpdate:value': props.modelModifiers.lazy ? undefined : update,
        onChange: (event) => {
          if (props.modelModifiers.lazy) update(event.target.value)
          if (typeof attrs.onChange === 'function') attrs.onChange(event)
        },
        class: [attrs.class, 'admin-antd-control-input']
      }, slots)
    }
  })
}

export const AdminInput = createInput('AdminInput', Input)
export const AdminTextarea = createInput('AdminTextarea', Input.TextArea)

// Resolve component refs to their native focus target for the existing modal
// lifecycle, validity checks, selection ranges and DOM containment comparisons.
export function nativeControl(element) {
  const root = element?.$el || element
  if (!root) return null
  return /^(BUTTON|INPUT|TEXTAREA)$/.test(root.tagName)
    ? root
    : root.querySelector?.('input, textarea, button') || root
}


const optionText = nodes => (Array.isArray(nodes) ? nodes.map(optionText).join('') : typeof nodes === 'object' && nodes ? optionText(nodes.children) : typeof nodes === 'string' || typeof nodes === 'number' ? String(nodes) : '')
const nativeOptions = nodes => (nodes || []).flatMap(node => {
  if (node.type === Fragment) return nativeOptions(node.children)
  if (node.type !== 'option') return []
  return [{ value: node.props?.value ?? optionText(node.children), label: optionText(node.children), disabled: node.props?.disabled === '' || Boolean(node.props?.disabled) }]
})

export const AdminSelect = defineComponent({
  name: 'AdminSelect',
  inheritAttrs: false,
  props: { modelValue: { default: undefined }, modelModifiers: { default: () => ({}) } },
  emits: ['update:modelValue'],
  setup(props, { attrs, slots, emit }) {
    let popupHost = null
    let registration = null
    const getPopupContainer = trigger => {
      let dialog = trigger
      while (dialog && dialog.getAttribute?.('role') !== 'dialog') dialog = dialog.parentElement || dialog.parentNode
      if (!dialog) return document.body
      if (!popupHost) {
        popupHost = document.createElement('div')
        document.body.appendChild(popupHost)
        registration = registerDialogPopupHost(dialog, popupHost, { manageLayerStyle: true })
      }
      return popupHost
    }
    onBeforeUnmount(() => {
      unregisterDialogPopupHost(registration)
      popupHost?.remove()
    })
    return () => h(Select, {
      ...attrs,
      value: props.modelValue !== undefined ? props.modelValue : attrs.value,
      options: attrs.options || nativeOptions(slots.default?.()),
      getPopupContainer,
      class: [attrs.class, 'admin-antd-control-select'],
      onChange: value => {
        emit('update:modelValue', value)
        attrs.onChange?.({ target: { value } })
      }
    })
  }
})


function createChoice(name, component, radio) {
  return defineComponent({
    name,
    inheritAttrs: false,
    props: { modelValue: { default: undefined } },
    emits: ['update:modelValue'],
    setup(props, { attrs, emit, slots }) {
      return () => h(component, {
        ...attrs,
        checked: radio ? props.modelValue === attrs.value : Array.isArray(props.modelValue) ? props.modelValue.includes(attrs.value) : Boolean(props.modelValue),
        onChange: event => {
          const checked = event.target.checked
          const value = radio ? attrs.value : Array.isArray(props.modelValue)
            ? checked ? [...props.modelValue.filter(value => value !== attrs.value), attrs.value] : props.modelValue.filter(value => value !== attrs.value)
            : checked
          emit('update:modelValue', value)
          attrs.onChange?.(event)
        }
      }, slots)
    }
  })
}
export const AdminCheckbox = createChoice('AdminCheckbox', Checkbox, false)
export const AdminRadio = createChoice('AdminRadio', Radio, true)
export const AdminSlider = defineComponent({
  name: 'AdminSlider', inheritAttrs: false,
  props: { modelValue: { default: 0 }, modelModifiers: { default: () => ({}) } },
  emits: ['update:modelValue'],
  setup(props, { attrs, emit }) {
    return () => h(Slider, {
      ...attrs, value: Number(props.modelValue),
      min: Number(attrs.min ?? 0), max: Number(attrs.max ?? 100), step: Number(attrs.step ?? 1),
      onChange: value => { emit('update:modelValue', value); attrs.onInput?.({ target: { value } }); attrs.onChange?.({ target: { value } }) }
    })
  }
})
