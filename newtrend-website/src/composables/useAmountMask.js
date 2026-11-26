import {shallowRef} from 'vue'

/**
 * Local "hide amounts" toggle shared by the summary cards, the header asset menu and the Assets page.
 * Each panel keeps its own state (like the reference). `masked(value)` returns the glyph while hidden;
 * the glyph defaults to the reference's '****' and callers may keep their own (Assets uses dots).
 */
export function useAmountMask(glyph = '****') {
  const hidden = shallowRef(false)
  const toggle = () => { hidden.value = !hidden.value }
  const masked = (value, mask = glyph) => (hidden.value ? mask : value)
  return {hidden, toggle, masked}
}
