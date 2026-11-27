<script setup>
import {computed} from 'vue'
import {useRoute} from 'vue-router'
import QuantFundDetail from '../../components/quant/QuantFundDetail.vue'
// /ai-quant/quant-fund/products/:productId — QuantFundDetail loads the product and renders loading / not-found itself.
const route=useRoute()
const productId=computed(()=>String(route.params.productId||''))
</script>
<template>
<QuantFundDetail :product-id="productId"/>
</template>
