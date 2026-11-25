<script setup>
import {computed,ref} from 'vue'
import {onBeforeRouteLeave,useRoute} from 'vue-router'
import {path} from '../data'
import {session} from '../session'
import LendingOrderDetail from '../components/lending/LendingOrderDetail.vue'
import '../styles/earn-fidelity.css'
import '../styles/earn-portfolio.css'
import '../styles/lending-fidelity.css'
const route=useRoute(),busy=ref(false)
const back=computed(()=>({path:path('/earn/loan/my'),query:{group:route.query.group||'ongoing',page:route.query.page||1}}))
onBeforeRouteLeave(()=>!busy.value)
</script>
<template>
 <article class="loan-order-page">
  <RouterLink class="earn-back" :to="back" :aria-disabled="busy" @click="busy&&$event.preventDefault()"><span aria-hidden="true">←</span>{{$t('earn.nav.myLoans')}}</RouterLink>
  <h1>{{$t('lending.orderDetails')}}</h1>
  <LendingOrderDetail v-if="session.loggedIn" :key="String(route.params.orderId)" :order-id="String(route.params.orderId)" @state="busy=$event.busy"/>
  <RouterLink v-else :to="path('/login')">{{$t('lending.login')}}</RouterLink>
 </article>
</template>
