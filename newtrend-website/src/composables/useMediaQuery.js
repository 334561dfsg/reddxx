import {onBeforeUnmount,shallowRef} from 'vue'
// Reactive media query for a component's lifetime (listener removed on unmount). Used where a layout change needs a
// different component structure rather than CSS alone, e.g. the compact mobile trading page.
export function useMediaQuery(query){
 const list=typeof matchMedia==='function'?matchMedia(query):null
 const matches=shallowRef(Boolean(list?.matches))
 const update=event=>{matches.value=event.matches}
 list?.addEventListener('change',update)
 onBeforeUnmount(()=>list?.removeEventListener('change',update))
 return matches
}
/** The trading page's compact (phone) layout, matching the 767px breakpoint in trade-workspace.css. */
export const COMPACT_TRADE_QUERY='(max-width: 767px)'
