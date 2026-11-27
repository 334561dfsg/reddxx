<script setup>
import {computed} from 'vue'
import {path} from '../../data'
import {t} from '../../i18n'
import QuantAmbient from '../../components/quant/QuantAmbient.vue'
import ChannelSectionSwitch from '../../components/ui/ChannelSectionSwitch.vue'
import '../../styles/quant-fidelity.css'
import '../../styles/quant-system.css'
// Shell of every Quant Fund page (list, positions, product detail, interest records): the `.quant-page.quant-sub`
// frame that quant-fidelity.css / quant-system.css target, the ambient backdrop and the 量化基金 / 我的倉位 switch.
// aurora: list and positions only. sectionSwitch: false on the interest-records page. productActive: the product detail
// keeps 量化基金 highlighted although its URL is not the list's.
const props=defineProps({aurora:Boolean,sectionSwitch:{type:Boolean,default:true},productActive:Boolean})
const sections=computed(()=>[
 {to:path('/ai-quant/quant-fund'),label:t('aiQuant.landing.quantFund.name'),icon:'shield',active:props.productActive},
 {to:path('/ai-quant/quant-fund/positions'),label:t('aiQuant.landing.quantFund.mine'),icon:'briefcase'},
])
</script>
<template>
<div class="page-wrap quant-page quant-sub">
 <QuantAmbient :aurora="aurora"/>
 <ChannelSectionSwitch v-if="sectionSwitch" class="subnav" :items="sections"/>
 <slot/>
</div>
</template>
<style>
.qf-skeleton-panel{display:grid;gap:14px;align-content:start}
.qf-skeleton-lines{display:grid;gap:8px;min-width:0}
.qf-skeleton-card .qf-card-head{height:62px;align-items:flex-start}
.qf-skeleton-card .qf-card-rate{height:52px;align-items:flex-end}
.qf-skeleton-limit{height:42px;align-content:center}
.qf-skeleton-progress{height:32px;align-content:space-between;gap:0}
.qf-skeleton-tags{display:flex;gap:8px;height:24px}
.qf-skeleton-cta{border-radius:999px}
.qf-skeleton-hero,.qf-skeleton-calc,.qf-skeleton-flow,.qf-skeleton-quota,.qf-skeleton-aside{overflow:hidden;box-sizing:border-box}
.qf-skeleton-hero{height:244px}
.qf-skeleton-calc{height:341px}
.qf-skeleton-flow{height:204px;gap:12px}
.qf-skeleton-quota{height:208px}
.qf-skeleton-aside{height:314px;gap:12px;align-content:space-between}
.qf-request-frame.nt-request-error{margin-top:16px}
</style>
