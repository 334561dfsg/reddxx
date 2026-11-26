<script setup>
import {computed,shallowRef} from 'vue'
// Port of the reference Slider: 2px track, white fill, mark dots, 12px thumb and magnetic snapping to marks.
// Adds the keyboard/ARIA slider semantics the reference lacks; focus is shown by a filled thumb, never a ring.
const props=defineProps({modelValue:{type:Number,required:true},min:{type:Number,default:0},max:{type:Number,default:100},step:{type:Number,default:1},marks:{type:Array,default:()=>[]},label:{type:String,default:''},labelledby:{type:String,default:''},valueText:{type:String,default:''}})
const emit=defineEmits(['update:modelValue'])
const SNAP=.02
const area=shallowRef(null),dragging=shallowRef(false)
let lastMark=null
const percent=value=>(value-props.min)/(props.max-props.min)*100
const clamp=value=>Math.max(props.min,Math.min(props.max,Math.round(value/props.step)*props.step))
const fill=computed(()=>percent(props.modelValue))
function nearestMark(value){let mark=props.marks[0],distance=Math.abs(value-mark);for(const item of props.marks){const d=Math.abs(value-item);if(d<distance){distance=d;mark=item}}return {mark,distance}}
function valueAt(clientX){
 const rect=area.value.getBoundingClientRect(),ratio=Math.max(0,Math.min(1,(clientX-rect.left)/rect.width)),raw=props.min+ratio*(props.max-props.min),zone=(props.max-props.min)*SNAP
 if(!props.marks.length||zone<=0)return clamp(raw)
 const {mark,distance}=nearestMark(raw)
 if(distance<=zone){lastMark=mark;return clamp(mark)}
 // Leaving a mark subtracts the snap zone so the thumb does not jump past the release point.
 if(lastMark!==null)return clamp(lastMark+(raw>=lastMark?1:-1)*(Math.abs(raw-lastMark)-zone))
 return clamp(raw)
}
function set(value){if(value!==props.modelValue)emit('update:modelValue',value)}
function down(event){if(event.button!==0)return;area.value.setPointerCapture(event.pointerId);lastMark=null;dragging.value=true;set(valueAt(event.clientX));event.currentTarget.parentElement.querySelector('[role=slider]')?.focus({preventScroll:true})}
function move(event){if(area.value?.hasPointerCapture(event.pointerId))set(valueAt(event.clientX))}
function up(event){if(area.value?.hasPointerCapture(event.pointerId))area.value.releasePointerCapture(event.pointerId);dragging.value=false}
function key(event){
 const page=Math.max(props.step,Math.round((props.max-props.min)/12))
 const next={ArrowRight:props.modelValue+props.step,ArrowUp:props.modelValue+props.step,ArrowLeft:props.modelValue-props.step,ArrowDown:props.modelValue-props.step,PageUp:props.modelValue+page,PageDown:props.modelValue-page,Home:props.min,End:props.max}[event.key]
 if(next===undefined)return
 event.preventDefault();set(clamp(next))
}
</script>
<template>
<div class="qf-slider" :class="{dragging}">
 <div ref="area" class="qf-slider-area" @pointerdown="down" @pointermove="move" @pointerup="up" @pointercancel="up">
  <div class="qf-slider-track"><div class="qf-slider-fill" :style="{width:fill+'%'}"></div><span v-for="mark in marks" :key="mark" class="qf-slider-dot" :class="{active:mark===modelValue}" :style="{left:percent(mark)+'%'}" aria-hidden="true"></span></div>
  <span class="qf-slider-thumb" role="slider" tabindex="0" :aria-valuemin="min" :aria-valuemax="max" :aria-valuenow="modelValue" :aria-valuetext="valueText||undefined" :aria-label="labelledby?undefined:label" :aria-labelledby="labelledby||undefined" :style="{left:fill+'%'}" @keydown="key"></span>
 </div>
 <div v-if="marks.length" class="qf-slider-labels"><button v-for="mark in marks" :key="mark" type="button" tabindex="-1" :style="{left:percent(mark)+'%'}" @click="set(mark)">{{ mark }}</button></div>
</div>
</template>
<style scoped>
.qf-slider{position:relative;width:100%;padding-right:6px;user-select:none;touch-action:none}
.qf-slider-area{position:relative;width:100%;padding:12px 0;cursor:pointer}
.qf-slider-track{position:relative;width:100%;height:2px;background:#303236}
.qf-slider-fill{position:absolute;left:0;top:0;height:100%;background:#fff;transition:width 150ms ease-out}
.qf-slider-dot{position:absolute;top:50%;width:6px;height:6px;border:1px solid color-mix(in srgb,#fff 62%,#05070b);border-radius:50%;background:#05070b;transform:translateY(-50%);transition:background-color 150ms,border-color 150ms}
.qf-slider-dot.active{border-color:#fff;background:#fff}
.qf-slider-thumb{position:absolute;top:50%;width:12px;height:12px;border:2px solid #fff;border-radius:50%;background:#05070b;transform:translate(-50%,-50%);transition:left 150ms ease-out,transform 150ms ease-out,background-color 150ms;outline:none;cursor:grab}
.qf-slider-thumb:focus-visible{background:#fff}
.dragging .qf-slider-fill,.dragging .qf-slider-thumb{transition:transform 150ms ease-out,background-color 150ms}
.dragging .qf-slider-thumb{transform:translate(-50%,-50%) scale(1.1);cursor:grabbing}
.qf-slider-labels{position:relative;width:100%;height:20px;margin-top:4px}
.qf-slider-labels button{position:absolute;top:0;padding:0;transform:translateX(-50%);font-size:12px;line-height:16px;color:color-mix(in srgb,#fff 62%,#05070b);white-space:nowrap}
.qf-slider-labels button:hover{color:#fff}
@media(prefers-reduced-motion:reduce){.qf-slider-fill,.qf-slider-thumb,.qf-slider-dot{transition:none}}
</style>
