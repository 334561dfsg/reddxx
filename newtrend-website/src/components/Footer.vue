<script setup>
import Icon from './Icon.vue'
import {path} from '../data'
import {openModal} from '../session'
const groups=[['關於我們',[['關於 NewQuantCapital','/about'],['隱私權政策','/privacy'],['服務條款','/content/terms']]],['風險與合規',[['監管資訊','/regulatory-information'],['使用者協議','/agreement'],['風險揭露聲明','/risk-disclosure']]],['產品服務',[['二元期權','/trade/options/BTCUSD'],['合約交易','/trade/futures/BTCUSD'],['現貨交易','/trade/spot/BTCUSD'],['AI 量化','/ai-quant'],['理財','/earn/simple']]],['幫助中心',[['常見問題','/help-center'],['公告列表','/messages']]]]
</script>
<template><footer class="site-footer"><div class="footer-columns"><div v-for="g in groups" :key="g[0]"><h3>{{ $tr(g[0]) }}</h3><RouterLink v-for="link in g[1]" :key="link[0]" :to="path(link[1])">{{ $tr(link[0]) }}</RouterLink><button v-if="g[0]==='幫助中心'" @click="openModal('support','線上客服')">{{ $tr("線上客服") }}</button></div></div><div class="footer-bottom"><RouterLink class="brand" :to="path('/')"><img src="/newtrend/assets/newquantcapital-mark.svg" :alt="$tr(&quot;&quot;)"/>{{ $tr("NewQuantCapital") }}</RouterLink><p>{{ $tr("© 2026 NewQuantCapital 交易平台. 保留所有權利. ") }}<small>{{ $tr("v1.40.6") }}</small></p><button @click="openModal('language','語言')"><Icon name="globe"/>{{ $tr("語言") }}</button><button :aria-label="$tr(&quot;電子郵件&quot;)" @click="openModal('support','聯絡我們')"><Icon name="mail"/></button></div></footer></template>
