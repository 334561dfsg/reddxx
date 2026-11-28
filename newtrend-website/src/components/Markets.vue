<script setup>
import {computed,shallowRef} from 'vue'
import {fmt,path} from '../data'
import Coin from './Coin.vue'
import PriceFlash from './PriceFlash.vue'
import Skeleton from './ui/Skeleton.vue'
// Live rows from the market stream; price/change are null until its first snapshot (skeletons keep the table size).
const props=defineProps({all:Boolean,rows:{type:Array,default:()=>[]}})
const category=shallowRef("aiQuant.templates.filterAll"),query=shallowRef('')
const visible=computed(()=>props.rows.filter(m=>m.category!=='aiQuant.market.stock'&&(category.value==="aiQuant.templates.filterAll"||m.category===category.value)&&m.name.toLowerCase().includes(query.value.toLowerCase())).slice(0,props.all?100:8))
</script>
<template><section id="markets" class="market-section"><div class="container"><h2 class="section-heading">{{ $t("home.markets.title") }}<em>{{ $t("home.markets.titleHighlight") }}</em></h2><div class="market-filters"><div class="tabs"><button v-for="c in [&quot;aiQuant.templates.filterAll&quot;,&quot;home.products.perpTag1&quot;,&quot;aiQuant.market.forex&quot;,&quot;trade.pages.energy&quot;]" :key="c" :aria-pressed="category===c" :class="{active:category===c}" @click="category=c">{{ $t(c) }}</button></div><input v-if="all" v-model="query" :placeholder="$t(&quot;trade.searchSymbol&quot;)" :aria-label="$t(&quot;trade.searchSymbol&quot;)"/></div><div class="market-table"><table><thead><tr><th>{{ $t("aiQuant.templates.fields.supportedSymbols") }}</th><th>{{ $t("home.markets.colPrice") }}</th><th class="market-extra">{{ $t("home.markets.colChange") }}</th><th class="market-extra">{{ $t("home.markets.colVolume") }}</th><th><span class="sr-only">{{ $t("aiQuant.table.columns.action") }}</span></th></tr></thead><tbody><tr v-for="m in visible" :key="m.id"><td><div class="coin-label"><Coin :symbol="m.symbol"/>{{ $t(m.name) }}</div><small class="mobile-market-details" :class="m.change<0?'negative':'positive'"><template v-if="m.price!==null">{{ m.change>0?'+':'' }}{{ m.change.toFixed(2) }}%</template><Skeleton v-else inline width="40px"/> · {{ $compact(m.volume) }}</small></td><PriceFlash as="td" :value="m.price??0"><template v-if="m.price!==null">{{ fmt(m.price) }}</template><Skeleton v-else inline width="80px"/></PriceFlash><td class="market-extra" :class="m.change<0?'negative':'positive'"><template v-if="m.price!==null">{{ m.change>0?'+':'' }}{{ m.change.toFixed(2) }}%</template><Skeleton v-else inline width="48px"/></td><td class="market-extra muted">{{ $compact(m.volume) }}</td><td><RouterLink :to="path('/trade/futures/'+m.id)" :aria-label="$t('common.tradeMarket',{symbol:m.name})">{{ $t("home.markets.tradeLink") }}</RouterLink></td></tr></tbody></table><p v-if="!visible.length" class="empty">{{ $t("markets.ui.noMatchingMarkets") }}</p><RouterLink class="market-more" :to="path('/trade/futures/BTCUSD')">{{ $t("home.markets.viewAllPlain") }}</RouterLink></div></div></section></template>

<style scoped>
.quote-controls{display:flex;align-items:center;justify-content:space-between;gap:16px;margin:64px 0 16px}.quote-controls .eyebrow{margin:0}.quote-controls button{min-height:40px;font-size:.75rem;flex-shrink:0}.market-table table{table-layout:fixed;width:100%}.market-table td{font-variant-numeric:tabular-nums}
@media(max-width:600px){.quote-controls{margin-top:40px}.market-table table{table-layout:auto}}
</style>
