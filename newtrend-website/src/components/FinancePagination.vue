<script setup>
import {computed} from 'vue'
const props=defineProps({page:{type:Number,required:true},total:{type:Number,required:true},pageSize:{type:Number,default:10}})
const emit=defineEmits(['update:page'])
const pages=computed(()=>Math.max(1,Math.ceil(props.total/props.pageSize)))
const numbers=computed(()=>{
 const start=Math.max(1,Math.min(props.page-2,pages.value-4))
 return Array.from({length:Math.min(5,pages.value)},(_,i)=>start+i)
})
function go(page){if(page>=1&&page<=pages.value&&page!==props.page)emit('update:page',page)}
</script>
<template>
<nav class="finance-pagination" :aria-label="$t('common.pagination.info',{total,page,totalPages:pages})">
 <span class="finance-pagination-info" aria-live="polite">{{$t('common.pagination.info',{total,page,totalPages:pages})}}</span>
 <div class="finance-pagination-controls">
  <button :disabled="page===1" :aria-label="$t('c2c.orders.prev')" @click="go(page-1)">‹</button>
  <button v-if="numbers[0]>1" @click="go(1)">1</button><span v-if="numbers[0]>2" aria-hidden="true">…</span>
  <button v-for="n in numbers" :key="n" :aria-current="page===n?'page':undefined" @click="go(n)">{{n}}</button>
  <span v-if="numbers.at(-1)<pages-1" aria-hidden="true">…</span><button v-if="numbers.at(-1)<pages" @click="go(pages)">{{pages}}</button>
  <button :disabled="page===pages" :aria-label="$t('c2c.orders.next')" @click="go(page+1)">›</button>
 </div>
</nav>
</template>
<style scoped>
.finance-pagination{display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:12px;margin-top:16px;color:#ffffff80;font-size:12px}
.finance-pagination-controls{display:flex;align-items:center;gap:4px;max-width:100%;flex-wrap:wrap}
.finance-pagination button{display:inline-flex;align-items:center;justify-content:center;min-width:36px;min-height:36px;border:0;border-radius:10px;padding:6px;background:#141619;color:#ffffffa6}
.finance-pagination button[aria-current=page]{background:var(--nt-accent);color:#101800}
.finance-pagination button:hover:not(:disabled),.finance-pagination button:focus-visible{background:#ffffff20;color:#fff;outline:none;box-shadow:none}
.finance-pagination button:disabled{opacity:.35;cursor:not-allowed}
@media(max-width:640px){.finance-pagination{justify-content:center}.finance-pagination-info{width:100%;text-align:center}.finance-pagination button{min-width:40px;min-height:44px}}
</style>
