<script setup>
import {computed,ref,watch} from 'vue'
import {fmt,path} from '../../data'
import {t} from '../../i18n'
import {session} from '../../session'
import {fundDate} from '../../utils/quantFund'
import {listWalletRecords} from '../../api/wallet.js'
import {useRequest} from '../../composables/useRequest.js'
import {useFinancePagination} from '../../composables/useFinancePagination.js'
import BackLink from '../ui/BackLink.vue'
import EmptyState from '../ui/EmptyState.vue'
import RequestState from '../ui/RequestState.vue'
import Skeleton from '../ui/Skeleton.vue'
import StatusTag from '../ui/StatusTag.vue'
import FinancePagination from '../FinancePagination.vue'
import '../../styles/earn-portfolio.css'

// 資金記錄 (/assets/records), a secondary page of the asset centre following the Finance channel conventions:
// BackLink (app top bar on phones), kind filter as equal segments, a table on desktop that becomes one card per
// record on phones (kind + status on top, amount and time, the record text underneath) and load-on-scroll paging.
const KINDS=['all','deposit','withdraw','transfer','exchange']
const kind=ref('all')
const request=useRequest(()=>listWalletRecords(session.mode),{key:()=>session.mode,tags:['wallet']})
const filtered=computed(()=>(request.data.value||[]).filter(r=>kind.value==='all'||r.kind===kind.value))
const {page,total,shown}=useFinancePagination(filtered)
watch([kind,()=>session.mode],()=>{page.value=1})
// Transfer labels carry account keys as params; seeded and live records are translated in the current language.
const recordText=label=>typeof label==='string'?t(label):t(label.key,Object.fromEntries(Object.entries(label.params||{}).map(([k,v])=>[k,t(String(v))])))
const kindLabel=value=>t(value==='all'?'assets.walletLog.all':'assets.walletLog.kinds.'+value)
</script>

<template>
<div class="asset-records">
 <BackLink :to="path('/assets')" :title="$t('assets.fundRecords')">{{ $t('assets.walletLog.back') }}</BackLink>
 <h1>{{ $t('assets.fundRecords') }}</h1>
 <div class="asset-record-tabs" role="group" :aria-label="$t('assets.walletLog.filter')">
  <button v-for="k in KINDS" :key="k" type="button" :aria-pressed="kind===k" :class="{active:kind===k}" @click="kind=k">{{ kindLabel(k) }}</button>
 </div>
 <RequestState v-if="request.status.value==='error'" :status="request.status.value" :error="request.error.value" @retry="request.refresh"/>
 <EmptyState v-else-if="request.status.value==='ready'&&!filtered.length" class="asset-record-empty" :text="$t('assets.ui.noRecordsYet')"/>
 <div v-else class="asset-record-table">
  <span v-if="request.status.value==='loading'" role="status" class="sr-only">{{ $t('common.loading') }}</span>
  <table>
   <thead><tr><th scope="col">{{ $t('assets.walletLog.type') }}</th><th scope="col">{{ $t('assets.walletLog.detail') }}</th><th scope="col" class="num">{{ $t('assets.walletLog.amount') }}</th><th scope="col">{{ $t('assets.walletLog.time') }}</th><th scope="col" class="end">{{ $t('assets.walletLog.state') }}</th></tr></thead>
   <tbody v-if="request.status.value==='loading'" aria-hidden="true">
    <tr v-for="n in 6" :key="n" class="asset-record-skeleton"><td><Skeleton inline width="48px"/></td><td><Skeleton inline width="160px"/></td><td class="num"><Skeleton inline width="96px"/></td><td><Skeleton inline width="120px"/></td><td class="end"><Skeleton inline width="56px"/></td></tr>
   </tbody>
   <tbody v-else>
    <tr v-for="r in shown" :key="r.id">
     <td class="asset-record-kind"><strong>{{ kindLabel(r.kind) }}</strong></td>
     <td class="asset-record-detail" :data-label="$t('assets.walletLog.detail')">{{ recordText(r.label) }}</td>
     <td class="num" :data-label="$t('assets.walletLog.amount')"><span class="asset-mono">{{ fmt(r.amount) }}</span> {{ r.symbol }}</td>
     <td :data-label="$t('assets.walletLog.time')">{{ fundDate(r.createdAt,true) }}</td>
     <td class="end asset-record-status"><StatusTag domain="wallet" :status="r.status"/></td>
    </tr>
   </tbody>
  </table>
  <FinancePagination v-if="request.status.value==='ready'" v-model:page="page" :total="total" scroll/>
 </div>
</div>
</template>
