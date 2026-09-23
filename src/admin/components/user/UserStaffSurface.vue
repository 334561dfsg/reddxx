<script setup>
import { computed, ref } from 'vue'
import { createDialogCloseAction, useDialogLifecycle } from '../../composables/useDialogLifecycle.js'
const props=defineProps({visible:Boolean,title:String,subtitle:String,drawer:Boolean,busy:Boolean,returnFocus:{default:null},initialFocus:{default:null},beforeClose:{type:Function,default:null}})
const emit=defineEmits(['close','closed'])
const panel=ref(null),title=ref(null)
const {rendered,phase,layerStyle,requestDialogClose,onAfterEnter,onAfterLeave}=useDialogLifecycle({open:computed(()=>props.visible),dialogRef:panel,initialFocusRef:computed(()=>props.initialFocus||title.value),returnFocusRef:computed(()=>props.returnFocus),closeDisabled:computed(()=>props.busy),requestClose:()=>{if(props.beforeClose?.()===false)return false;emit('close')}})
const close=createDialogCloseAction(requestDialogClose)
async function afterLeave(){if(await onAfterLeave())emit('closed')}
defineExpose({close})
</script>
<template>
  <Teleport to="body">
    <Transition :name="drawer?'staff-drawer':'staff-dialog'" appear @after-enter="onAfterEnter" @after-leave="afterLeave">
      <div v-if="rendered" v-show="phase!=='closing'" class="staff-overlay fixed inset-0 bg-slate-950/50" :class="drawer?'flex justify-end':'grid place-items-center p-3 sm:p-4'" :style="layerStyle" role="presentation">
        <section ref="panel" class="staff-surface flex w-full flex-col overflow-hidden bg-white shadow-2xl" :class="drawer?'staff-drawer-panel max-w-6xl':'staff-dialog-panel max-w-2xl rounded-xl'" role="dialog" aria-modal="true" :aria-labelledby="drawer?'staff-report-title':'staff-editor-title'" :aria-busy="busy">
          <header class="staff-safe-x shrink-0 border-b border-slate-200 px-5 py-4 flex items-start justify-between gap-3">
            <div class="min-w-0"><h2 :id="drawer?'staff-report-title':'staff-editor-title'" ref="title" tabindex="-1" class="break-words text-lg font-semibold text-slate-900 outline-none">{{ props.title }}</h2><p v-if="subtitle" class="mt-1 break-words text-sm text-slate-500">{{ subtitle }}</p></div>
            <button type="button" :disabled="busy" aria-label="关闭" class="staff-focus min-h-10 min-w-10 shrink-0 rounded-lg text-2xl text-slate-400 hover:bg-slate-100 disabled:opacity-40" @click="close">×</button>
          </header>
          <div class="staff-safe-x min-h-0 flex-1 overflow-y-auto overscroll-contain px-5 py-4"><slot /></div>
          <footer class="staff-safe-x shrink-0 border-t border-slate-200 bg-slate-50 px-5 py-3"><slot name="footer" :close="close"><button class="staff-focus rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm" type="button" @click="close">关闭</button></slot></footer>
        </section>
      </div>
    </Transition>
  </Teleport>
</template>
<style scoped>
.staff-overlay{padding-top:max(.75rem,env(safe-area-inset-top));padding-bottom:max(.75rem,env(safe-area-inset-bottom));padding-left:max(.75rem,env(safe-area-inset-left));padding-right:max(.75rem,env(safe-area-inset-right))}
.staff-dialog-panel{max-height:calc(100vh - 2rem);max-height:calc(100dvh - 2rem)}
.staff-drawer-panel{height:calc(100vh - 1.5rem);height:calc(100dvh - 1.5rem);border-radius:.75rem}
.staff-focus:focus-visible{outline:2px solid #2563eb;outline-offset:3px}
.staff-dialog-enter-active,.staff-drawer-enter-active{transition:opacity 200ms ease-out}.staff-dialog-leave-active,.staff-drawer-leave-active{transition:opacity 150ms ease-in}
.staff-dialog-enter-active .staff-surface,.staff-drawer-enter-active .staff-surface{transition:transform 200ms ease-out,opacity 200ms ease-out}.staff-dialog-leave-active .staff-surface,.staff-drawer-leave-active .staff-surface{transition:transform 150ms ease-in,opacity 150ms ease-in}
.staff-dialog-enter-from,.staff-dialog-leave-to,.staff-drawer-enter-from,.staff-drawer-leave-to{opacity:0}.staff-dialog-enter-from .staff-surface,.staff-dialog-leave-to .staff-surface{transform:scale(.96);opacity:0}.staff-drawer-enter-from .staff-surface,.staff-drawer-leave-to .staff-surface{transform:translateX(100%)}
@media(prefers-reduced-motion:reduce){.staff-dialog-enter-active,.staff-dialog-leave-active,.staff-drawer-enter-active,.staff-drawer-leave-active,.staff-dialog-enter-active .staff-surface,.staff-dialog-leave-active .staff-surface,.staff-drawer-enter-active .staff-surface,.staff-drawer-leave-active .staff-surface{transition-duration:50ms}.staff-dialog-enter-from .staff-surface,.staff-dialog-leave-to .staff-surface,.staff-drawer-enter-from .staff-surface,.staff-drawer-leave-to .staff-surface{transform:none}}
</style>
