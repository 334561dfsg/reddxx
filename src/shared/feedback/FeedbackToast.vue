<script setup>
import {computed,nextTick,onBeforeUnmount,onMounted,ref,watch} from 'vue'
import {ConfigProvider,message} from 'ant-design-vue'
import {queueFeedback,cancelFeedback} from './queue.js'
// Adapter for existing reactive validation state. No visible inline notice is rendered.
defineOptions({inheritAttrs:false})
const props=defineProps({source:{type:Function,required:true},type:{type:String,default:'error'}})
const anchor=ref(null)
const text=computed(()=>String(props.source()||'').trim())
const [api,ContextHolder]=message.useMessage({maxCount:1,duration:5})
const ready=ref(false)
let mounted=false, disposed=false, form=null
const repeatAttempt=()=>nextTick(()=>publish(text.value))
const owner=()=>anchor.value?.closest('dialog[open], [role="dialog"], .ant-modal-content, .ant-drawer-content')||document.body
function publish(value){if(!mounted||!value||value!==text.value)return;queueFeedback(api,owner(),value,props.type)}
watch(text,value=>{if(mounted)nextTick(()=>publish(value))},{flush:'sync'})
onMounted(async()=>{ready.value=true;await nextTick();if(disposed)return;mounted=true;form=anchor.value?.closest('form');form?.addEventListener('submit',repeatAttempt,true);publish(text.value)})
onBeforeUnmount(()=>{disposed=true;mounted=false;form?.removeEventListener('submit',repeatAttempt,true);cancelFeedback(api);api.destroy()})
// Existing error-summary refs now send focus to an editable invalid control.
function focus(){owner().querySelector('[aria-invalid="true"]:not([disabled]), input:not([disabled]), button:not([disabled])')?.focus()}
defineExpose({focus})
const host=()=>anchor.value?.closest('dialog[open]')||document.body
</script>
<template>
 <span ref="anchor" :id="$attrs.id" :data-testid="$attrs['data-testid']" class="feedback-accessible-description">{{text}}</span>
 <ConfigProvider v-if="ready" :get-popup-container="host"><ContextHolder/></ConfigProvider>
 <slot/>
 <slot name="action"/>
</template>
<style>
.feedback-accessible-description{position:absolute!important;width:1px!important;height:1px!important;padding:0!important;margin:-1px!important;overflow:hidden!important;clip-path:inset(50%)!important;white-space:nowrap!important;border:0!important}
</style>
