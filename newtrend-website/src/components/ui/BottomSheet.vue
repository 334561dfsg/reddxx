<script setup>
import {nextTick,onBeforeUnmount,onDeactivated,ref,useId,watch} from 'vue'
// Modal bottom sheet for phone flows that open their own dialogs through Overlay (e.g. the C2C order form opens the
// agreement and confirmation dialogs). It is a native modal <dialog>: Overlay's dialog, opened later with showModal,
// stacks above it in the top layer while this sheet stays inert underneath, and Escape reaches only the top layer.
// Drawer rules (AGENTS.md): no backdrop, drag or swipe close; fixed header with the × button; only the body scrolls;
// 200ms slide-up / 150ms slide-down (≤50ms fade with reduced motion); focus moves to the title, Tab stays inside,
// focus returns to the trigger; page scroll is locked while open. The dialog stays in the DOM while closed so callers
// can teleport content into `bodyId` and keep one instance across layout changes.
const props=defineProps({open:Boolean,title:{type:String,default:''},bodyId:{type:String,default:undefined}})
const emit=defineEmits(['update:open'])
const dialog=ref(null),closing=ref(false)
const titleId=useId()
let trigger=null,previousOverflow=null,timer=null
const reduced=()=>matchMedia('(prefers-reduced-motion: reduce)').matches
async function show(){
 clearTimeout(timer);closing.value=false
 if(!dialog.value||dialog.value.open)return
 trigger=document.activeElement;previousOverflow=document.body.style.overflow
 dialog.value.showModal();document.body.style.overflow='hidden'
 await nextTick();dialog.value.querySelector('[data-initial-focus]')?.focus()
}
function finish(restoreFocus=true){
 clearTimeout(timer);closing.value=false
 if(!dialog.value?.open)return
 dialog.value.close();document.body.style.overflow=previousOverflow??''
 if(restoreFocus&&trigger?.isConnected)trigger.focus()
}
function hide(){if(!dialog.value?.open||closing.value)return;closing.value=true;timer=setTimeout(finish,reduced()?50:150)}
watch(()=>props.open,value=>value?show():hide())
function requestClose(){if(!closing.value)emit('update:open',false)}
function cancel(event){event.preventDefault();requestClose()}
function keydown(event){
 if(event.key!=='Tab')return
 const items=[...dialog.value.querySelectorAll('button:not([disabled]),a[href],input:not([disabled]),select:not([disabled]),textarea:not([disabled]),[tabindex="0"]')].filter(el=>el.getClientRects().length)
 if(!items.length){event.preventDefault();return}
 const first=items[0],last=items[items.length-1]
 if(event.shiftKey&&document.activeElement===first){event.preventDefault();last.focus()}
 else if(!event.shiftKey&&document.activeElement===last){event.preventDefault();first.focus()}
}
// A kept-alive page leaving (route change) or unmounting closes at once and releases the scroll lock.
onDeactivated(()=>finish(false))
onBeforeUnmount(()=>finish(false))
</script>
<template>
<dialog ref="dialog" class="nt-bottom-sheet" :class="{closing}" :aria-labelledby="titleId" @cancel="cancel" @keydown="keydown">
 <header class="nt-bottom-sheet-header"><h2 :id="titleId" tabindex="-1" data-initial-focus>{{ title }}</h2><button type="button" class="nt-bottom-sheet-close" :aria-label="$t('aiQuant.detail.close')" @click="requestClose">×</button></header>
 <div :id="bodyId" class="nt-bottom-sheet-body"><slot/></div>
</dialog>
</template>
<style>
.nt-bottom-sheet{position:fixed;inset:auto 0 0;margin:0;width:100%;max-width:100%;max-height:85vh;max-height:85dvh;padding:0;border:1px solid #ffffff10;border-bottom:0;border-radius:16px 16px 0 0;background:#101317;color:#fff;overflow:hidden;flex-direction:column}
.nt-bottom-sheet[open]{display:flex;animation:nt-sheet-up 200ms ease-out}
.nt-bottom-sheet.closing{animation:nt-sheet-down 150ms ease-in forwards}
.nt-bottom-sheet::backdrop{background:#000000b3;animation:nt-sheet-fade 200ms ease-out}
.nt-bottom-sheet.closing::backdrop{animation:nt-sheet-fade 150ms ease-in reverse forwards}
.nt-bottom-sheet-header{flex:none;display:flex;align-items:center;justify-content:space-between;gap:12px;min-height:56px;padding:6px max(8px,env(safe-area-inset-right)) 6px max(20px,env(safe-area-inset-left));border-bottom:1px solid #ffffff0d}
.nt-bottom-sheet-header h2{margin:0;min-width:0;font-family:inherit;font-size:16px;line-height:24px;font-weight:600;overflow-wrap:anywhere}
.nt-bottom-sheet-header h2:focus{outline:none}
.nt-bottom-sheet-close{flex:none;display:grid;place-items:center;width:40px;height:40px;padding:0;border:0;border-radius:10px;background:#ffffff0d;font-size:20px;line-height:1;color:#fffc}
.nt-bottom-sheet-close:hover,.nt-bottom-sheet-close:focus-visible{outline:none;background:#ffffff1f;color:#fff}
.nt-bottom-sheet-body{flex:1 1 auto;min-height:0;overflow-y:auto;overscroll-behavior:contain;padding:16px max(20px,env(safe-area-inset-right)) max(20px,env(safe-area-inset-bottom)) max(20px,env(safe-area-inset-left))}
@keyframes nt-sheet-up{from{transform:translateY(100%)}to{transform:translateY(0)}}
@keyframes nt-sheet-down{to{transform:translateY(100%)}}
@keyframes nt-sheet-fade{from{opacity:0}to{opacity:1}}
@media(prefers-reduced-motion:reduce){
 .nt-bottom-sheet[open]{animation:nt-sheet-fade 50ms linear}
 .nt-bottom-sheet.closing{animation:nt-sheet-fade 50ms linear reverse forwards}
 .nt-bottom-sheet::backdrop,.nt-bottom-sheet.closing::backdrop{animation-duration:50ms}
}
</style>
