<script setup>
import {ref,watch} from 'vue'
import {useRoute} from 'vue-router'
import Icon from '../Icon.vue'
import LineIcon from './LineIcon.vue'
// Shared channel section switch (理財 / 我的理財, 借貸 / 我的借貸, 策略模板 / 我的策略, 量化基金 / 我的倉位).
// The root <nav> carries the caller's class (.subnav / .strategy-nav) so channel-system.css, quant-system.css and the
// per-channel fidelity sheets keep targeting it as a direct child of the page. When the row overflows, a mouse can
// drag it sideways (a drag never activates a link) and the active entry is scrolled into view on route changes.
// items: [{to, label, icon, iconSet?, active?}] — `icon` is an Icon name, or a LineIcon name when `iconSet` is given;
// `active` adds the .active class for entries the router's exact-active class does not cover.
defineProps({items:{type:Array,required:true},ariaLabel:{type:String,default:undefined}})
const route=useRoute()
const nav=ref(null)
watch([nav,()=>route.path],([element],_previous,onCleanup)=>{
 if(!element)return
 function revealActive(){
  const active=element.querySelector('.router-link-exact-active')
  if(!active||element.scrollWidth<=element.clientWidth)return
  const frame=element.getBoundingClientRect(),item=active.getBoundingClientRect()
  if(item.left<frame.left+4)element.scrollLeft-=frame.left+4-item.left
  else if(item.right>frame.right-4)element.scrollLeft+=item.right-frame.right+4
 }
 revealActive()
 const observer=new ResizeObserver(revealActive)
 observer.observe(element)
 onCleanup(()=>observer.disconnect())
},{flush:'post',immediate:true})
let drag=null
let suppressClick=false
function startDrag(event){
 if(event.pointerType!=='mouse'||event.button!==0||event.currentTarget.scrollWidth<=event.currentTarget.clientWidth)return
 suppressClick=false
 drag={id:event.pointerId,x:event.clientX,left:event.currentTarget.scrollLeft,moved:false}
}
function moveDrag(event){
 if(!drag||event.pointerId!==drag.id)return
 const delta=event.clientX-drag.x
 if(!drag.moved&&Math.abs(delta)<6)return
 drag.moved=true
 event.currentTarget.setPointerCapture(event.pointerId)
 event.currentTarget.scrollLeft=drag.left-delta
 event.preventDefault()
}
function endDrag(event){
 if(!drag||event.pointerId!==drag.id)return
 suppressClick=drag.moved
 if(event.currentTarget.hasPointerCapture(event.pointerId))event.currentTarget.releasePointerCapture(event.pointerId)
 drag=null
}
function leave(){if(!drag?.moved)drag=null}
// A drag that ended on a link must not follow it; keyboard activation (detail 0) always passes.
function click(event){
 if(suppressClick&&event.detail!==0){event.preventDefault();event.stopPropagation()}
 suppressClick=false
}
</script>
<template>
<nav
 ref="nav"
 :aria-label="ariaLabel"
 @pointerdown="startDrag"
 @pointermove="moveDrag"
 @pointerup="endDrag"
 @pointercancel="endDrag"
 @lostpointercapture="drag=null"
 @pointerleave="leave"
 @click.capture="click"
 @dragstart.prevent
>
 <RouterLink
  v-for="item in items"
  :key="item.label"
  :to="item.to"
  :class="{active:item.active}"
 >
  <LineIcon v-if="item.iconSet" :set="item.iconSet" :name="item.icon"/>
  <Icon v-else-if="item.icon" :name="item.icon"/>{{ item.label }}
 </RouterLink>
</nav>
</template>
