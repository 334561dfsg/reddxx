<script setup>
import {useAmountMask} from '../composables/useAmountMask.js'
import {money} from '../utils/format.js'
import {computed,ref,watch} from 'vue'
import {useRoute,useRouter} from 'vue-router'
import {markets,path,fmt} from '../data'
import {session,openModal} from '../session'
import Skeleton from '../components/ui/Skeleton.vue'
import RequestState from '../components/ui/RequestState.vue'
import AssetRecords from '../components/assets/AssetRecords.vue'
import {getAssetsOverview} from '../api/wallet.js'
import {useRequest} from '../composables/useRequest.js'
import Coin from '../components/Coin.vue'
import Icon from '../components/Icon.vue'
const route=useRoute(),router=useRouter(),account=ref("assets.tabs.funding")
const section=computed(()=>route.params.section==='overview'?'':route.params.section||'')
// Transfer is a dialog over the overview. /assets/transfer (header menu, old links) lands on the overview and opens it;
// the route is replaced first because the overlay closes on route changes.
const openTransfer=()=>openModal('transfer','assets.transfer')
watch(section,async value=>{if(value!=='transfer')return;await router.replace(path('/assets'));openTransfer()},{immediate:true})
// Overview (account values, balances, prices) for the current mode; it reflects every domain's holdings, so any
// module's mutation refreshes it. Labels stay while values are skeletons. Records are their own secondary page.
const coins=[...markets.filter(m=>['BTC','ETH','SOL','XRP'].includes(m.symbol)),{symbol:'USDT'},{symbol:'USDC'},{symbol:'DAI'}]
const ACCOUNTS=['assets.tabs.funding','assets.tabs.trading','assets.distribution.earnAccount','assets.distribution.quantFundAccount']
const overview=useRequest(()=>getAssetsOverview(session.mode,coins.map(c=>c.symbol)),{key:()=>session.mode,tags:['wallet','earn','quantFund','strategy','c2c']})
const ready=computed(()=>overview.status.value==='ready')
const wallet=computed(()=>overview.data.value?.balances||{})
const accountValues=computed(()=>overview.data.value?.accounts||{})
const total=computed(()=>overview.data.value?.total||0)
const priceOf=symbol=>overview.data.value?.prices[symbol]||0
const coinAmount=symbol=>account.value==='assets.tabs.funding'?(wallet.value[symbol]||0):symbol==='USDT'?accountValues.value[account.value]:0
const {hidden,toggle,masked}=useAmountMask('••••')
</script>

<template>
<div class="page-wrap assets-page">
 <AssetRecords v-if="section==='records'"/>
 <template v-else>
  <h1 class="sr-only">{{ $t('assets.pageTitle') }}</h1>
  <section class="card account-overview" :aria-label="$t('assets.totalAssets')">
   <div class="summary-line">
    <span>{{ $t("assets.totalAssets") }}<button class="icon-button" :aria-label="$t('common.assetsMenu.hideBalance')" :aria-pressed="hidden" @click="toggle">◉</button></span>
    <span class="tag-chip">{{ $t(session.mode) }}{{ $t("profile.groupAccount") }}</span>
   </div>
   <span v-if="!ready&&overview.status.value!=='error'" role="status" class="sr-only">{{ $t('common.loading') }}</span>
   <div class="asset-total"><template v-if="ready">{{ masked(money(total),'••••••') }}</template><Skeleton v-else inline width="220px"/><small> USDT</small></div>
   <div class="asset-today"><span class="muted">{{ $t("assets.todayProfit") }}</span><span class="positive">0.00 (0.00%)</span></div>
   <div class="asset-actions">
    <RouterLink :to="path('/deposit')"><Icon name="wallet" green/>{{ $t("assets.deposit") }}</RouterLink>
    <RouterLink :to="path('/withdraw')"><Icon name="arrow-right"/>{{ $t("assets.typeWithdraw") }}</RouterLink>
    <button type="button" aria-haspopup="dialog" @click="openModal('flash-exchange','assets.convert.title')"><Icon name="coins"/>{{ $t("assets.convert.title") }}</button>
    <button type="button" aria-haspopup="dialog" @click="openTransfer"><Icon name="trending-up-down"/>{{ $t("assets.transfer") }}</button>
    <RouterLink :to="path('/assets/records')"><Icon name="layers"/>{{ $t("assets.history") }}</RouterLink>
   </div>
  </section>
  <div class="asset-grid">
   <aside class="card asset-accounts">
    <div class="summary-line"><h2>{{ $t("assets.distribution.title") }}</h2><span class="mini-label">USDT</span></div>
    <div class="asset-distribution" aria-hidden="true"><div class="donut"><strong><template v-if="ready">{{ masked(money(total)) }}</template><Skeleton v-else inline width="96px"/></strong><span class="mini-label">{{ $t("assets.totalAssets") }}</span></div></div>
    <div class="asset-account-list" role="group" :aria-label="$t('assets.walletLog.accounts')">
     <button v-for="a in ACCOUNTS" :key="a" type="button" class="asset-account-button" :class="{active:account===a}" :aria-pressed="account===a" @click="account=a"><span>{{ $t(a) }}</span><span><template v-if="ready">{{ masked(money(accountValues[a])) }}</template><Skeleton v-else inline width="72px"/> <small>USDT</small></span></button>
    </div>
   </aside>
   <section class="card asset-coins">
    <div class="summary-line"><h2>{{ $t(account) }}{{ $t("assets.ui.details") }}</h2><span class="mini-label">{{ $t("assets.ui.assetAvailableBalance") }}</span></div>
    <RequestState v-if="overview.status.value==='error'" :status="overview.status.value" :error="overview.error.value" @retry="overview.refresh"/>
    <div v-for="m in coins" v-else :key="m.symbol" class="asset-coin">
     <span class="coin-label"><Coin :symbol="m.symbol"/>{{ $t(m.symbol) }}</span>
     <span><span class="asset-mono"><template v-if="ready">{{ masked(fmt(coinAmount(m.symbol))) }}</template><Skeleton v-else inline width="64px"/></span><small class="mini-label">≈ <template v-if="ready">{{ masked(money(coinAmount(m.symbol)*priceOf(m.symbol))) }}</template><Skeleton v-else inline width="56px"/> USDT</small></span>
    </div>
   </section>
  </div>
 </template>
</div>
</template>
<style scoped>.donut{border:12px solid #ffffff0b;width:160px;height:160px;border-radius:50%;display:flex;flex-direction:column;justify-content:center;gap:10px}.donut strong{font-size:1.5rem}.asset-coin{display:flex;justify-content:space-between;align-items:center;gap:20px;padding:20px 0;border-bottom:1px solid #ffffff0a}.asset-coin>span:last-child{text-align:right}.asset-coin small{display:block;margin-top:6px}.asset-account-button small{font-size:0.625rem;color:var(--nt-text-muted)}
</style>
