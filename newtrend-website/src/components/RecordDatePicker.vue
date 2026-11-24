<script setup>
import { computed, ref, nextTick, onBeforeUnmount, watch } from 'vue'
import { useRoute } from 'vue-router'
import { dateKey, parseDate, monthDays, shiftMonth } from '../utils/calendar'
const props=defineProps({id:{type:String,required:true},modelValue:String,label:String,placeholder:String,min:String,max:String})
const emit=defineEmits(['update:modelValue'])
const route=useRoute(),trigger=ref(null),panel=ref(null),open=ref(false),closing=ref(false),month=ref(new Date()),active=ref(''),position=ref({})
let timer
const today=dateKey(new Date())
const title=computed(()=>new Intl.DateTimeFormat('en-US',{month:'long',year:'numeric'}).format(month.value))
const days=computed(()=>monthDays(month.value.getFullYear(),month.value.getMonth()))
const weeks=computed(()=>Array.from({length:days.value.length/7},(_,i)=>days.value.slice(i*7,i*7+7)))
const name=date=>new Intl.DateTimeFormat('en-US',{weekday:'long',year:'numeric',month:'long',day:'numeric'}).format(date)
const disabled=date=>(props.min&&dateKey(date)<props.min)||(props.max&&dateKey(date)>props.max)
function clamp(date){return props.min&&dateKey(date)<props.min?parseDate(props.min):props.max&&dateKey(date)>props.max?parseDate(props.max):date}
function positionPanel(){if(!trigger.value||!open.value)return;const r=trigger.value.getBoundingClientRect(),v=window.visualViewport,w=v?.width||innerWidth,h=v?.height||innerHeight,x=v?.offsetLeft||0,y=v?.offsetTop||0;const width=Math.min(250,w-16),height=92+weeks.value.length*40,below=y+h-r.bottom-36,above=r.top-y-8,up=below<height&&above>below,available=Math.max(100,up?above:below);position.value={left:Math.max(x+8,Math.min(r.left,x+w-width-8))+'px',top:Math.max(y+8,up?r.top-Math.min(height,available)-4:r.bottom+4)+'px',width:width+'px',maxHeight:Math.min(height,available)+'px'}}
function listen(on){const fn=on?'addEventListener':'removeEventListener';document[fn]('pointerdown',outside,true);document[fn]('focusin',focusChanged);window[fn]('resize',positionPanel);window[fn]('scroll',positionPanel,true);window.visualViewport?.[fn]('resize',positionPanel);window.visualViewport?.[fn]('scroll',positionPanel)}
async function show(){if(open.value||closing.value)return;const date=clamp(parseDate(props.modelValue)||new Date());active.value=dateKey(date);month.value=new Date(date.getFullYear(),date.getMonth(),1,12);open.value=true;listen(true);positionPanel();await nextTick();panel.value?.querySelector('.calendar-prev')?.focus()}
function close(restore=true){if(!open.value||closing.value)return;closing.value=true;listen(false);timer=setTimeout(()=>{open.value=false;closing.value=false;if(restore)trigger.value?.focus()},matchMedia('(prefers-reduced-motion: reduce)').matches?0:100)}
function outside(e){if(!trigger.value?.contains(e.target)&&!panel.value?.contains(e.target))close(false)}
function focusChanged(e){if(!trigger.value?.contains(e.target)&&!panel.value?.contains(e.target))close(false)}
function select(date){if(disabled(date)||closing.value)return;emit('update:modelValue',dateKey(date));close()}
async function navigate(offset){month.value=shiftMonth(month.value,offset);const date=clamp(new Date(month.value.getFullYear(),month.value.getMonth(),1,12));active.value=dateKey(date);await nextTick();positionPanel()}
async function dayKey(e,date){let next
if(e.key==='ArrowLeft')next=new Date(date.getFullYear(),date.getMonth(),date.getDate()-1,12)
if(e.key==='ArrowRight')next=new Date(date.getFullYear(),date.getMonth(),date.getDate()+1,12)
if(e.key==='ArrowUp')next=new Date(date.getFullYear(),date.getMonth(),date.getDate()-7,12)
if(e.key==='ArrowDown')next=new Date(date.getFullYear(),date.getMonth(),date.getDate()+7,12)
if(e.key==='Home')next=new Date(date.getFullYear(),date.getMonth(),date.getDate()-date.getDay(),12)
if(e.key==='End')next=new Date(date.getFullYear(),date.getMonth(),date.getDate()+6-date.getDay(),12)
if(e.key==='PageUp'||e.key==='PageDown')next=shiftMonth(date,(e.key==='PageUp'?-1:1)*(e.shiftKey?12:1))
if(!next)return;e.preventDefault();next=clamp(next);active.value=dateKey(next);month.value=new Date(next.getFullYear(),next.getMonth(),1,12);await nextTick();positionPanel();document.getElementById(props.id+'-'+active.value)?.focus()}
watch(()=>route.fullPath,()=>close(false))
onBeforeUnmount(()=>{listen(false);clearTimeout(timer)})
</script>
<template>
<button ref="trigger" class="record-date-trigger" type="button" :aria-label="label" :aria-expanded="open" :aria-controls="id+'-calendar'" @click="open?close():show()" @keydown.esc.stop.prevent="close()"><svg viewBox="0 0 16 16" aria-hidden="true"><rect x="2" y="3" width="12" height="11" rx="2"/><path d="M5 1v4M11 1v4M2 7h12"/></svg><span>{{ modelValue||placeholder }}</span></button>
<Teleport to="body"><section v-if="open" :id="id+'-calendar'" ref="panel" class="record-calendar" :class="{closing}" :style="position" :aria-label="label" @keydown.esc.stop.prevent="close()">
<header class="calendar-header"><button class="calendar-prev" type="button" :aria-label="$t('trade.calendar.previousMonth')" @click="navigate(-1)"><svg viewBox="0 0 16 16"><path d="m10 4-4 4 4 4"/></svg></button><span role="status" aria-live="polite">{{ title }}</span><button type="button" :aria-label="$t('trade.calendar.nextMonth')" @click="navigate(1)"><svg viewBox="0 0 16 16"><path d="m6 4 4 4-4 4"/></svg></button></header>
<div class="calendar-body"><table role="grid" :aria-label="title"><thead><tr><th v-for="day in ['Su','Mo','Tu','We','Th','Fr','Sa']" :key="day" scope="col">{{ day }}</th></tr></thead><tbody><tr v-for="(week,i) in weeks" :key="i"><td v-for="day in week" :key="dateKey(day)" role="gridcell" :aria-selected="modelValue===dateKey(day)" :class="{today:today===dateKey(day),outside:day.getMonth()!==month.getMonth()}"><button :id="id+'-'+dateKey(day)" type="button" :tabindex="active===dateKey(day)?0:-1" :aria-label="name(day)" :aria-current="today===dateKey(day)?'date':undefined" :disabled="disabled(day)" :class="{selected:modelValue===dateKey(day)}" @click="select(day)" @keydown="dayKey($event,day)" @focus="active=dateKey(day)">{{ day.getDate() }}</button></td></tr></tbody></table></div>
</section></Teleport>
</template>
<style scoped>
.record-date-trigger{display:inline-flex;align-items:center;gap:6px;min-height:32px;padding:0;background:transparent;color:#a0a1a2;font:12px/16px 'Exo 2','PingFang SC',Arial,sans-serif;white-space:nowrap}.record-date-trigger svg{width:14px;height:14px;fill:none;stroke:currentColor;stroke-width:1.3}.record-date-trigger:hover{color:#fff}.record-date-trigger:focus-visible{outline:1px solid #ffffff3d;outline-offset:2px;border-radius:4px}.record-calendar{position:fixed;z-index:50;display:flex;flex-direction:column;box-sizing:border-box;padding:12px;border:1px solid #282a2d;border-radius:12px;background:#05070b;color:white;box-shadow:0 4px 12px #0003;overflow:hidden;font-family:'Exo 2','PingFang SC',Arial,sans-serif;animation:calendar-in 150ms ease-out}.record-calendar.closing{animation:calendar-out 100ms ease-in forwards;pointer-events:none}.calendar-header{position:relative;display:flex;align-items:center;justify-content:space-between;height:32px;flex-shrink:0;margin-bottom:16px}.calendar-header span{font-size:14px;line-height:20px;font-weight:500}.calendar-header button{width:32px;height:36px;display:flex;align-items:center;justify-content:center;border-radius:50%;padding:0}.calendar-header svg{width:16px;height:16px;fill:none;stroke:currentColor;stroke-width:1.5}.calendar-body{overflow:auto;min-height:0;scrollbar-width:thin}.calendar-body table{width:100%;border-collapse:collapse;border-spacing:0;table-layout:fixed}.calendar-body tr{display:flex}.calendar-body th{width:calc(100% / 7);font-size:12px;line-height:18px;font-weight:400;color:#76777a;padding:0}.calendar-body tbody tr{margin-top:8px}.calendar-body td{border:0;background:transparent;line-height:0;width:calc(100% / 7);height:32px;padding:0;position:relative;text-align:center}.calendar-body button{display:flex;align-items:center;justify-content:center;width:100%;height:32px;min-width:0;border:0;border-radius:50%;padding:0;font:400 14px/14px 'Exo 2','PingFang SC',Arial,sans-serif;color:#fff;background:transparent}.calendar-body .outside button{color:#76777a}.calendar-body .today{background:#a5ff4a;border-radius:12px}.calendar-body .today button{color:#05070b}.calendar-body button.selected,.calendar-body button:hover:not(:disabled),.calendar-header button:hover{background:#a5ff4a;color:#05070b}.record-calendar button:focus-visible{outline:1px solid #ffffff70;outline-offset:-1px}.calendar-body button:disabled{opacity:.35;cursor:not-allowed}.record-calendar .today:has(button:disabled){background:transparent}@keyframes calendar-in{from{opacity:0;transform:translateY(3px)}to{opacity:1;transform:none}}@keyframes calendar-out{to{opacity:0}}@media(prefers-reduced-motion:reduce){.record-calendar,.record-calendar.closing{animation:none}}
</style>
