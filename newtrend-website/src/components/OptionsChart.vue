<script setup>
import { shallowRef, onMounted, onUnmounted, watch } from 'vue'
import { t, locale } from '../i18n'
const props=defineProps({candles:Array,price:Number,interval:String})
const canvas=shallowRef(null),active=shallowRef(null)
let observer
const count=110
// Candles come from the market stream (history snapshot + live last candle); the chart only draws them.
const series=()=>props.candles||[]
function draw(){
  const c=canvas.value;if(!c)return
  const w=c.clientWidth,h=c.clientHeight;if(!w||!h)return
  const dpr=devicePixelRatio||1;c.width=w*dpr;c.height=h*dpr
  const ctx=c.getContext('2d');ctx.scale(dpr,dpr)
  if(!props.candles?.length||!Number.isFinite(props.price))return
  const volumeHeight=Math.min(70,Math.max(24,h*.18))
  const left=8,right=w-76,top=24,bottom=h-volumeHeight-48,volumeBottom=h-22,span=right-left,step=span/count
  const data=series(),low=Math.min(props.price,...data.map(d=>d.low)),high=Math.max(props.price,...data.map(d=>d.high)),padding=Math.max((high-low)*.12,props.price*.001)
  const min=low-padding,max=high+padding,y=p=>top+(max-p)/(max-min)*(bottom-top)
  const color=d=>d.close>=d.open?'#5bbb91':'#ef4e69'
  ctx.font='11px "Exo 2",sans-serif';ctx.strokeStyle='#ffffff10';ctx.lineWidth=1;ctx.setLineDash([2,3])
  for(let i=0;i<=6;i++){const price=max-(max-min)*i/6,py=y(price);ctx.beginPath();ctx.moveTo(left,py);ctx.lineTo(right,py);ctx.stroke();ctx.fillStyle='#ffffff80';ctx.fillText(price.toLocaleString('en-US',{maximumFractionDigits:props.price<1?6:0}),right+8,py+4)}
  for(let i=0;i<5;i++){const x=left+span*i/4;ctx.beginPath();ctx.moveTo(x,top);ctx.lineTo(x,volumeBottom);ctx.stroke();if(i<4){ctx.fillStyle='#ffffff80';ctx.fillText(label(data,i),x+6,h-7)}}ctx.setLineDash([])
  data.forEach((d,i)=>{const x=left+(i+.5)*step;ctx.fillStyle=ctx.strokeStyle=color(d);ctx.beginPath();ctx.moveTo(x,y(d.high));ctx.lineTo(x,y(d.low));ctx.stroke();ctx.fillRect(x-step*.32,Math.min(y(d.open),y(d.close)),Math.max(1,step*.64),Math.max(1,Math.abs(y(d.open)-y(d.close))));ctx.fillRect(x-step*.32,volumeBottom,Math.max(1,step*.64),-d.volume/180*volumeHeight)})
  const py=y(props.price);ctx.strokeStyle='#ef4e69';ctx.setLineDash([3,3]);ctx.beginPath();ctx.moveTo(left,py);ctx.lineTo(right,py);ctx.stroke();ctx.setLineDash([]);ctx.fillStyle='#ef4e69';ctx.fillRect(right,py-9,76,18);ctx.fillStyle='white';ctx.fillText(props.price.toLocaleString('en-US',{maximumFractionDigits:props.price<1?6:2}),right+4,py+4)
  ctx.fillStyle='#ef4e69';ctx.fillText('VOL '+data.at(-1).volume.toFixed(2),10,bottom+16)
  if(active.value!==null&&data[active.value]){const i=active.value,d=data[i],x=left+(i+.5)*step;ctx.strokeStyle='#ffffff70';ctx.setLineDash([3,3]);ctx.beginPath();ctx.moveTo(x,top);ctx.lineTo(x,volumeBottom);ctx.stroke();ctx.setLineDash([]);ctx.fillStyle='#111820';ctx.fillRect(8,20,Math.min(350,w-16),18);ctx.fillStyle='#d8dde4';ctx.fillText(`${t('trade.open')}: ${d.open.toFixed(2)}  ${t('trade.close')}: ${d.close.toFixed(2)}`,14,33)}
}
// Axis dates at the quarter marks, from the candles' own times.
function label(data,i){const d=data[Math.min(data.length-1,Math.floor(i*data.length/4))];if(!d)return '';const at=new Date(d.time);return `${String(at.getMonth()+1).padStart(2,'0')}-${String(at.getDate()).padStart(2,'0')}`}
function pointer(e){const r=canvas.value.getBoundingClientRect();active.value=Math.max(0,Math.min(count-1,Math.floor((e.clientX-r.left-8)/(r.width-84)*count)));draw()}
function key(e){if(e.key==='ArrowLeft'||e.key==='ArrowRight'){e.preventDefault();active.value=Math.max(0,Math.min(count-1,(active.value??count-1)+(e.key==='ArrowLeft'?-1:1)));draw()}}
onMounted(()=>{observer=new ResizeObserver(draw);observer.observe(canvas.value)});onUnmounted(()=>observer?.disconnect())
watch(()=>[props.candles,props.price,props.interval,locale.value],draw)
</script>
<template><canvas ref="canvas" class="options-chart" role="img" tabindex="0" :aria-label="$t('chart.ui.simulatedCandlestickChart')+' · '+price+' · '+$t(interval)" @pointermove="pointer" @pointerleave="active=null;draw()" @keydown="key" @blur="active=null;draw()"/></template>
<style scoped>.options-chart{display:block;width:100%;height:100%;min-height:250px;min-width:0;flex:1}.options-chart:focus-visible{outline:none}</style>
