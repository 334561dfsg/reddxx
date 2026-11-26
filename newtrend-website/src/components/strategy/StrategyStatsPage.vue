<script setup>
import BackLink from '../ui/BackLink.vue'
import Skeleton from '../ui/Skeleton.vue'
import {path} from '../../data'
import StrategyDailyStats from './StrategyDailyStats.vue'
// Standalone 查看統計 page (same pattern as Quant Fund 派息明細): back link, strategy name, daily stats panel.
// The record is resolved by pages/Strategy.vue (which renders not-found); null while the account is loading, when the
// back link and heading label stay and the name, subtitle and stats panel are skeletons.
defineProps({record:{type:Object,default:null}})
</script>
<template>
<div class="strategy-container strategy-stats-page">
 <BackLink :to="path('/ai-quant/strategy/mine')" class="strategy-stats-back">{{ $t('aiQuant.quantFund.interestRecords.back') }}</BackLink>
 <span v-if="!record" role="status" class="sr-only">{{ $t('common.loading') }}</span>
 <header class="strategy-stats-head"><span>{{ $t('aiQuant.actions.viewStats') }}</span><h1><template v-if="record">{{ record.template.name }}</template><Skeleton v-else inline width="320px"/></h1><p><template v-if="record">{{ $t(record.template.style) }} · {{ $t(record.template.market) }}</template><Skeleton v-else inline width="140px"/></p></header>
 <section class="strategy-stats-card"><StrategyDailyStats :items="record?.dailyStats||[]" :loading="!record"/></section>
</div>
</template>
<style>
.strategy-stats-page{display:flex;flex-direction:column;gap:16px;padding-top:17px;padding-bottom:56px}
.strategy-stats-back{display:inline-flex;align-items:center;gap:4px;align-self:flex-start;font-size:14px;line-height:20px;color:#87888a}
.strategy-stats-back svg{width:16px;height:16px;fill:none;stroke:currentColor;stroke-width:2;stroke-linecap:round;stroke-linejoin:round}
.strategy-stats-back:hover,.strategy-stats-back:focus-visible{outline:none;color:#fff;text-decoration:underline}
.strategy-stats-head{display:flex;flex-direction:column;gap:8px;margin:16px 0 8px}
.strategy-stats-head span{font-size:12px;line-height:16px;letter-spacing:.22em;text-transform:uppercase;color:color-mix(in srgb,#fff 62%,var(--nt-bg))}
.strategy-stats-head h1{margin:0;font-family:var(--nt-font-display);font-size:36px;line-height:40px;font-weight:600;letter-spacing:-.025em}
.strategy-stats-head p{margin:0;font-size:14px;line-height:20px;color:#87888a}
.strategy-stats-card{overflow:hidden;border:1px solid #191b1f;border-radius:32px;background:#14161a}
.strategy-stats-card>.ds{border-top:0}
.strategy-stats-card>.ms-stats-empty{margin:0;padding:40px 20px;text-align:center;font-size:14px;color:#87888a}
</style>
