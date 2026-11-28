<script setup>
import {computed,useTemplateRef} from 'vue'
import {fmt} from '../../data'
import {isDemo,MODE_DEMO,MODE_REAL} from '../../utils/accountMode.js'
import {session,requestModeSwitch} from '../../session'
import {streamStatus} from '../../composables/useMarket.js'
import {useMarketFavorites} from '../../composables/useMarketFavorites'
import {useScrollOverflow} from '../../composables/useScrollOverflow.js'
import Coin from '../Coin.vue'
import LineIcon from '../ui/LineIcon.vue'
import Skeleton from '../ui/Skeleton.vue'
// The trading page's instrument bar: pair, favourite, live price, 24h stats and the stream status.
// layout: 'wide' (≥1200px, beside the pair panel: the pair is plain text, the stats sit right-aligned on one line and
// scroll sideways if they do not fit), 'tablet' (the pair opens the left pair drawer) or 'compact' (phone: pair drawer,
// account badge, product switch and chart page button; no stats). The parent owns routing: it handles the
// open-pairs / open-products / open-chart events. pair is the catalogue market, livePair the same with live figures,
// live the raw ticker (null while loading: skeletons); productLabel names the current product for the phone switch.
const props=defineProps({
 pair:{type:Object,required:true},livePair:{type:Object,required:true},live:Object,hasVolume:Boolean,
 layout:{type:String,default:'wide',validator:value=>['wide','tablet','compact'].includes(value)},productLabel:String,
})
const emit=defineEmits(['open-pairs','open-products','open-chart'])
const compact=computed(()=>props.layout==='compact')
const {favorites,favorite}=useMarketFavorites('nt-trade-favorites')
const starred=computed(()=>favorites.value.includes(props.pair.id))
const direction=computed(()=>props.livePair.change<0?'negative':'positive')
// Account badge (GMXX 真實帳戶, phone only): shows the current mode; tapping asks to switch (same confirmation as the header).
const demoMode=computed(()=>isDemo(session.mode))
const switchMode=()=>requestModeSwitch(demoMode.value?MODE_REAL:MODE_DEMO)
const statsEl=useTemplateRef('statsEl')
const stats=useScrollOverflow(statsEl,{enabled:()=>props.layout==='wide'})
</script>
<template>
<section class="instrument-bar" :aria-label="$t('trade.pages.marketOverview')">
  <div class="instrument-identity">
    <span v-if="layout==='wide'" class="pair-static"><Coin :symbol="pair.symbol"/><strong>{{ pair.name }}</strong></span>
    <button v-else type="button" class="pair-trigger" aria-haspopup="dialog" :aria-label="$t('trade.form.tradingAsset')+' '+pair.name" @click="emit('open-pairs')"><Coin :symbol="pair.symbol"/><strong>{{ pair.name }}</strong><LineIcon name="caret-down"/></button>
    <button v-if="compact&&session.loggedIn" type="button" class="account-badge" :class="{demo:demoMode}" aria-haspopup="dialog" @click="switchMode">{{ $t(demoMode?'common.demo.account':'common.demo.realAccount') }}</button>
    <button v-if="!compact" class="instrument-favorite" :aria-label="$t(starred?'common.unfavoriteMarket':'common.favoriteMarket',{symbol:pair.name})" :aria-pressed="starred" @click="favorite(pair.id)">{{ starred?'★':'☆' }}</button>
  </div>
  <div v-if="compact" class="instrument-tools"><button type="button" class="product-switch" aria-haspopup="dialog" :aria-label="$t('trade.pages.product')+' '+productLabel" @click="emit('open-products')">{{ productLabel }}<LineIcon name="caret-down"/></button><button type="button" class="chart-toggle" :aria-label="$t('trade.pages.showChart')" :title="$t('trade.pages.showChart')" @click="emit('open-chart')"><LineIcon name="candlestick"/></button></div>
  <strong class="instrument-price" :class="direction"><template v-if="live">{{ fmt(livePair.price) }}<small v-if="compact" class="instrument-change">{{ livePair.change>0?'+':'' }}{{ livePair.change }}%</small></template><Skeleton v-else inline width="120px"/></strong>
  <button v-if="compact" class="instrument-favorite compact-favorite" :aria-label="$t(starred?'common.unfavoriteMarket':'common.favoriteMarket',{symbol:pair.name})" :aria-pressed="starred" @click="favorite(pair.id)">{{ starred?'★':'☆' }}</button>
  <dl v-else ref="statsEl" class="instrument-stats" :class="{'has-more':stats.more.value}" @scroll.passive="stats.update" @wheel="stats.onWheel">
    <div><dt>{{ $t('home.markets.colChange') }}</dt><dd :class="direction"><template v-if="live">{{ livePair.change }}%</template><Skeleton v-else inline width="48px"/></dd></div>
    <div><dt>{{ $t('trade.24hHigh') }}</dt><dd><template v-if="live">{{ fmt(livePair.high) }}</template><Skeleton v-else inline width="72px"/></dd></div>
    <div><dt>{{ $t('trade.24hLow') }}</dt><dd><template v-if="live">{{ fmt(livePair.low) }}</template><Skeleton v-else inline width="72px"/></dd></div>
    <div><dt>{{ $t('home.markets.colVolume') }}</dt><dd>{{ hasVolume?`${$compact(pair.volume/pair.price)} ${pair.symbol}`:'—' }}</dd></div>
    <div><dt>{{ $t('trade.turnover') }}</dt><dd>{{ hasVolume?`${$compact(pair.volume)} USDT`:'—' }}</dd></div>
  </dl>
  <span v-if="streamStatus!=='open'" class="stream-status" role="status"><span class="stream-dot" aria-hidden="true"></span>{{ $t(streamStatus==='reconnecting'?'trade.stream.reconnecting':'trade.stream.connecting') }}</span>
</section>
</template>
