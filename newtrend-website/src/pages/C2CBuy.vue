<script setup>
import LineIcon from '../components/ui/LineIcon.vue'
import {computed} from 'vue'
import {useRoute} from 'vue-router'
import {path} from '../data'
import C2CAccounts from '../components/c2c/C2CAccounts.vue'
import C2COrders from '../components/c2c/C2COrders.vue'
import C2CTradePanel from '../components/c2c/C2CTradePanel.vue'
import '../styles/c2c-fidelity.css'
const route=useRoute()
const section=computed(()=>route.params.c2cPage||'buy')
const content=computed(()=>section.value==='orders'?C2COrders:section.value==='payment-accounts'?C2CAccounts:C2CTradePanel)
const nav=[['buy','c2c.nav.buy','buy'],['sell','c2c.nav.sell','sell'],['orders','c2c.nav.orders','orders'],['payment-accounts','c2c.nav.paymentAccounts','bank']]
</script>
<template>
<div class="c2c-page">
 <nav class="c2c-nav" :aria-label="$t('c2c.nav.ariaLabel')"><RouterLink v-for="[id,label,icon] in nav" :key="id" :to="path('/c2c/'+id)"><LineIcon set="c2c" :name="icon"/>{{ $t(label) }}</RouterLink></nav>
 <KeepAlive><component :is="content" :key="section" :side="section"/></KeepAlive>
</div>
</template>
