<script setup>
import {fmt} from '../../data'
const tiers=[0,100000,500000,1000000,5000000,10000000]
</script>
<template><div class="card"><small>{{ $t("profile.vip.currentTierLabel") }}</small><p class="metric">{{ $t("VIP 0") }}</p><p class="muted">{{ $t("overlay.ui.100000UsdMoreToReachVip1") }}</p></div><h3 class="section-gap">{{ $t("profile.vip.tiersLabel") }}</h3><div v-for="(amount,index) in tiers" :key="index" class="summary-line" style="padding:16px 0;border-bottom:1px solid #ffffff0b"><strong>{{ $t("VIP ") }}{{ $t(index) }}</strong><span>{{ $t(fmt(amount)) }}{{ $t(" USDT") }}</span></div></template>
