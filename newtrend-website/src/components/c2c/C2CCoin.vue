<script setup>
import {computed} from 'vue'
const props=defineProps({symbol:{type:String,required:true}})
const source=computed(()=>['ETH','USDC','BTC','SOL'].includes(props.symbol)?`/NewQuantCapital/assets/c2c/${props.symbol.toLowerCase()}.svg`:'/NewQuantCapital/assets/usdt.svg')
</script>
<template><img class="coin" :src="source" :alt="symbol"/></template>
<style scoped>.coin{object-fit:cover;border-radius:50%;flex-shrink:0}</style>
