<script setup>
import {computed} from 'vue'
import {coinImage} from '../utils/coinAssets'
// The only coin icon component. set="logo" uses the flat SVG logos (C2C, deposit); default uses market logos.
const props=defineProps({symbol:String,set:{type:String,default:'market'}})
const src=computed(()=>props.symbol?coinImage(props.symbol,props.set):null)
</script>
<template><img v-if="src" :src="src" :alt="symbol" class="coin"/><span v-else class="coin coin-text" aria-hidden="true">{{ symbol?.slice(0,2) }}</span></template>
