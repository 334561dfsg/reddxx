<script setup>
import { shallowRef, onMounted, onUnmounted, watch } from 'vue'
import { t, locale } from '../i18n'
const props=defineProps({price:Number,interval:String,showMa:Boolean,showVolume:Boolean})
const canvas=shallowRef(null),active=shallowRef(null)
let observer
const count=110
function series(){
  const anchors=[[0,1.032],[18,1.006],[25,.938],[39,1.024],[59,1.018],[78,1.03],[86,1.077],[91,1.021],[109,1]]
  const seed=[...props.interval].reduce((sum,c)=>sum+c.charCodeAt(0),0)
  return Array.from({length:count},(_,i)=>{
    const end=anchors.findIndex(p=>p[0]>=i),a=anchors[Math.max(0,end-1)],b=anchors[end]
    const value=a[1]+(b[1]-a[1])*(b[0]===a[0]?0:(i-a[0])/(b[0]-a[0]))
    const close=i===count-1?props.price:props.price*(value+Math.sin(i*2.3+seed)*.003)
    const open=close+props.price*Math.sin(i*1.7+seed)*.004
    return {open,close,high:Math.max(open,close)+props.price*(.001+Math.abs(Math.sin(i))*.002),low:Math.min(open,close)-props.price*(.001+Math.abs(Math.cos(i))*.002),volume:15+Math.abs(Math.sin(i*1.77))*25+(i===25||i===86?140:0)}
  })
}
function draw(){
  const c=canvas.value;if(!c)return
  const w=c.clientWidth,h=c.clientHeight;if(!w||!h)return
  const dpr=devicePixelRatio||1;c.width=w*dpr;c.height=h*dpr
  const ctx=c.getContext('2d');ctx.scale(dpr,dpr)
  const left=8,right=w-76,top=38,bottom=h-(props.showVolume?116:30),volumeBottom=h-26,span=right-left,step=span/count
  const min=props.price*.9,max=props.price*1.1,y=p=>top+(max-p)/(max-min)*(bottom-top)
  const data=series(),color=d=>d.close>=d.open?'#5bbb91':'#ef4e69'
  ctx.font='11px "Exo 2",sans-serif';ctx.strokeStyle='#ffffff10';ctx.lineWidth=1;ctx.setLineDash([2,3])
  for(let i=0;i<=6;i++){const price=max-(max-min)*i/6,py=y(price);ctx.beginPath();ctx.moveTo(left,py);ctx.lineTo(right,py);ctx.stroke();ctx.fillStyle='#ffffff80';ctx.fillText(price.toLocaleString('en-US',{maximumFractionDigits:props.price<1?6:0}),right+8,py+4)}
  for(let i=0;i<5;i++){const x=left+span*i/4;ctx.beginPath();ctx.moveTo(x,top);ctx.lineTo(x,volumeBottom);ctx.stroke();if(i<4){ctx.fillStyle='#ffffff80';ctx.fillText(['11-21','11-22','11-23','11-24'][i],x+6,h-7)}}ctx.setLineDash([])
  data.forEach((d,i)=>{const x=left+(i+.5)*step;ctx.fillStyle=ctx.strokeStyle=color(d);ctx.beginPath();ctx.moveTo(x,y(d.high));ctx.lineTo(x,y(d.low));ctx.stroke();ctx.fillRect(x-step*.32,Math.min(y(d.open),y(d.close)),Math.max(1,step*.64),Math.max(1,Math.abs(y(d.open)-y(d.close))));if(props.showVolume)ctx.fillRect(x-step*.32,volumeBottom,Math.max(1,step*.64),-d.volume/180*70)})
  if(props.showMa){[7,25,99].forEach((period,line)=>{ctx.strokeStyle=['#d1b64c','#bb589c','#7863d8'][line];ctx.beginPath();data.forEach((d,i)=>{const start=Math.max(0,i-period+1),mean=data.slice(start,i+1).reduce((sum,p)=>sum+p.close,0)/(i-start+1),x=left+(i+.5)*step;i?ctx.lineTo(x,y(mean)):ctx.moveTo(x,y(mean))});ctx.stroke();ctx.fillStyle=ctx.strokeStyle;ctx.fillText('MA('+period+'): '+(data.slice(-Math.min(period,count)).reduce((sum,d)=>sum+d.close,0)/Math.min(period,count)).toFixed(2),10+line*145,16)})}
  const py=y(props.price);ctx.strokeStyle='#ef4e69';ctx.setLineDash([3,3]);ctx.beginPath();ctx.moveTo(left,py);ctx.lineTo(right,py);ctx.stroke();ctx.setLineDash([]);ctx.fillStyle='#ef4e69';ctx.fillRect(right,py-9,76,18);ctx.fillStyle='white';ctx.fillText(props.price.toLocaleString('en-US',{maximumFractionDigits:props.price<1?6:2}),right+4,py+4)
  if(props.showVolume){ctx.fillStyle='#ef4e69';ctx.fillText('VOL '+data.at(-1).volume.toFixed(2),10,bottom+16);ctx.fillStyle='#69a6b7';ctx.fillText('MAVOL(7): 35.29',90,bottom+16);ctx.fillStyle='#bb589c';ctx.fillText('MAVOL(14): 36.20',210,bottom+16)}
  if(active.value!==null){const i=active.value,d=data[i],x=left+(i+.5)*step;ctx.strokeStyle='#ffffff70';ctx.setLineDash([3,3]);ctx.beginPath();ctx.moveTo(x,top);ctx.lineTo(x,volumeBottom);ctx.stroke();ctx.setLineDash([]);ctx.fillStyle='#111820';ctx.fillRect(8,20,Math.min(350,w-16),18);ctx.fillStyle='#d8dde4';ctx.fillText(`${t('trade.open')}: ${d.open.toFixed(2)}  ${t('trade.close')}: ${d.close.toFixed(2)}`,14,33)}
}
function pointer(e){const r=canvas.value.getBoundingClientRect();active.value=Math.max(0,Math.min(count-1,Math.floor((e.clientX-r.left-8)/(r.width-84)*count)));draw()}
function key(e){if(e.key==='ArrowLeft'||e.key==='ArrowRight'){e.preventDefault();active.value=Math.max(0,Math.min(count-1,(active.value??count-1)+(e.key==='ArrowLeft'?-1:1)));draw()}}
onMounted(()=>{observer=new ResizeObserver(draw);observer.observe(canvas.value)});onUnmounted(()=>observer?.disconnect())
watch(()=>[props.price,props.interval,props.showMa,props.showVolume,locale.value],draw)
</script>
<template><canvas ref="canvas" class="options-chart" role="img" tabindex="0" :aria-label="$t('chart.ui.simulatedCandlestickChart')+' · '+price+' · '+$t(interval)" @pointermove="pointer" @pointerleave="active=null;draw()" @keydown="key" @blur="active=null;draw()"/></template>
<style scoped>.options-chart{display:block;width:100%;height:100%;min-height:250px;min-width:0;flex:1}.options-chart:focus-visible{outline:1px solid var(--nt-accent);outline-offset:-1px}</style>
