<script setup>
// 帳變記錄, after gmxx.io/changeRecord: change-type / account-type / currency filters, a ledger table (type, account,
// currency, signed change, balance after, time) and pagination. Served by the profile API (local mock ledger).
import {computed,reactive,ref,watch} from 'vue'
import NtSelect from '../../components/ui/NtSelect.vue'
import Skeleton from '../../components/ui/Skeleton.vue'
import RequestState from '../../components/ui/RequestState.vue'
import FinancePagination from '../../components/FinancePagination.vue'
import LineIcon from '../../components/ui/LineIcon.vue'
import {t} from '../../i18n'
import {ACCOUNT_TYPES,CHANGE_TYPES,LEDGER_CURRENCIES,listAccountChanges} from '../../api/profile.js'
import {useRequest} from '../../composables/useRequest.js'
const PAGE_SIZE = 10
const filters = reactive({type: '', account: '', currency: ''}), page = ref(1)
watch(filters, () => { page.value = 1 })
const all = () => ({value: '', label: t('profile.center.records.all')})
const typeOptions = computed(() => [all(), ...CHANGE_TYPES.map(value => ({value, label: t('profile.center.records.types.' + value)}))])
const accountOptions = computed(() => [all(), ...ACCOUNT_TYPES.map(value => ({value, label: t('profile.center.records.accounts.' + value)}))])
const currencyOptions = computed(() => [all(), ...LEDGER_CURRENCIES.map(value => ({value, label: value}))])
const records = useRequest(() => listAccountChanges({...filters, page: page.value, pageSize: PAGE_SIZE}), {key: () => JSON.stringify({...filters, page: page.value}), tags: ['account-changes']})
const filtered = computed(() => Boolean(filters.type || filters.account || filters.currency))
function reset() { Object.assign(filters, {type: '', account: '', currency: ''}) }
const DIGITS = {BTC: 6, ETH: 5}
const amount = (value, currency, signed) => (signed && value > 0 ? '+' : '') + value.toLocaleString('en-US', {minimumFractionDigits: DIGITS[currency] || 2, maximumFractionDigits: DIGITS[currency] || 2})
const time = value => { const d = new Date(value), p = n => String(n).padStart(2, '0'); return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())} ${p(d.getHours())}:${p(d.getMinutes())}:${p(d.getSeconds())}` }
const COLUMNS = ['type', 'account', 'currency', 'amount', 'balance', 'time'], NUMERIC = ['amount', 'balance']
</script>
<template>
<h1 class="pc-title">{{ $t('profile.center.records.title') }}</h1>
<div class="pc-filters">
 <label class="pc-field"><span id="pc-filter-type">{{ $t('profile.center.records.changeType') }}</span><NtSelect variant="pill" v-model:value="filters.type" class="pc-select" aria-labelledby="pc-filter-type" :options="typeOptions" :list-height="320" :show-search="false"/></label>
 <label class="pc-field"><span id="pc-filter-account">{{ $t('profile.center.records.accountType') }}</span><NtSelect variant="pill" v-model:value="filters.account" class="pc-select" aria-labelledby="pc-filter-account" :options="accountOptions" :show-search="false"/></label>
 <label class="pc-field"><span id="pc-filter-currency">{{ $t('profile.center.records.currency') }}</span><NtSelect variant="pill" v-model:value="filters.currency" class="pc-select" aria-labelledby="pc-filter-currency" :options="currencyOptions" :show-search="false"/></label>
 <button type="button" class="pc-button" :disabled="!filtered" @click="reset">{{ $t('profile.center.records.reset') }}</button>
</div>
<section class="pc-card pc-table-card" :aria-busy="records.refreshing.value||undefined">
 <RequestState :status="records.status.value" :error="records.error.value" @retry="records.refresh">
  <template #loading><div class="pc-table-scroll"><table class="pc-table"><thead><tr><th v-for="column in COLUMNS" :key="column" scope="col" :class="{num: NUMERIC.includes(column)}">{{ $t('profile.center.records.columns.'+column) }}</th></tr></thead><tbody><tr v-for="row in PAGE_SIZE" :key="row"><td v-for="column in COLUMNS" :key="column" :class="{num: NUMERIC.includes(column)}"><Skeleton inline :width="column==='time'?'136px':'64px'"/></td></tr></tbody></table></div></template>
  <div class="pc-table-scroll">
   <table class="pc-table">
    <thead><tr><th v-for="column in COLUMNS" :key="column" scope="col" :class="{num: NUMERIC.includes(column)}">{{ $t('profile.center.records.columns.'+column) }}</th></tr></thead>
    <tbody v-if="records.data.value.items.length">
     <tr v-for="row in records.data.value.items" :key="row.id">
      <td>{{ $t('profile.center.records.types.'+row.type) }}</td>
      <td>{{ $t('profile.center.records.accounts.'+row.account) }}</td>
      <td>{{ row.currency }}</td>
      <td class="num" :class="row.amount>=0?'up':'down'">{{ amount(row.amount, row.currency, true) }}</td>
      <td class="num">{{ amount(row.balance, row.currency) }}</td>
      <td class="pc-time">{{ time(row.createdAt) }}</td>
     </tr>
    </tbody>
    <tbody v-else><tr><td :colspan="COLUMNS.length"><div class="pc-empty"><LineIcon name="inbox"/>{{ $t('profile.center.records.empty') }}</div></td></tr></tbody>
   </table>
  </div>
 </RequestState>
</section>
<FinancePagination v-if="records.data.value?.total>PAGE_SIZE" v-model:page="page" :total="records.data.value.total" :page-size="PAGE_SIZE"/>
</template>
