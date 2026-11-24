<script setup>
import { computed, shallowRef } from 'vue'
import { session, openModal } from '../session'
import { fmt, path } from '../data'
import { t } from '../i18n'
const props = defineProps({ pair: { type: Object, required: true } })
const durations = [[30,15],[60,20],[120,30],[180,50],[300,70]]
const selected = shallowRef(30), amount = shallowRef('100'), error = shallowRef('')
const rate = computed(() => durations.find(item => item[0] === selected.value)[1])
const expected = computed(() => Number.isFinite(Number(amount.value)) ? Math.max(0,Number(amount.value))*rate.value/100 : 0)
function submit(side) {
  error.value=''
  if(!session.loggedIn){error.value='trade.ui.signInToTheLocalDemoFirst';return}
  if(!Number.isFinite(Number(amount.value))||Number(amount.value)<100){error.value='trade.amountBelowMinimum';return}
  if(Number(amount.value)>100000){error.value='assets.withdraw.error.insufficientBalance';return}
  openModal('order',`${t(side)} · ${props.pair.name}`,{
    symbol:'USD',min:100,max:100000,amount:amount.value,side,kind:'options',marketName:props.pair.name,bucket:'optionsOrders',direction:side==='trade.buyUp'?'buy':'sell',
    name:`${t('trade.optionTrade')} ${t(side)} ${props.pair.name}`,
    description:`${t('trade.durationSeconds',{value:selected.value})} · ${t('trade.payoutRate')} ${rate.value}% · ${t('trade.expectedReturn')} +${fmt(expected.value)} USD`,
  })
}
</script>
<template>
  <div class="options-form">
    <div class="duration-label"><span>{{ $t('trade.period') }} / {{ $t('trade.payoutRate') }}</span><button class="help" :aria-label="$t('trade.help')" @click="openModal('info','trade.payoutRate',{description:{key:'trade.payoutRateTooltip',params:{asset:'USD'}}})">ⓘ</button></div>
    <div class="duration-grid"><button v-for="[seconds,payout] in durations" :key="seconds" :aria-pressed="selected===seconds" :class="{active:selected===seconds}" @click="selected=seconds"><span>{{ $t('trade.durationSeconds',{value:seconds}) }}</span><span>{{ payout }}%</span></button></div>
    <div class="amount-heading"><label for="options-amount">{{ $t('trade.amount') }}</label><span>{{ $t('trade.minBet') }} 100 USD</span></div>
    <div class="amount-field"><input id="options-amount" v-model="amount" type="number" min="100" max="100000" step="1" inputmode="decimal" placeholder="≥ 100" :aria-invalid="Boolean(error)" :aria-describedby="error?'options-error':undefined" @input="error=''"/><span>USD</span></div>
    <div class="quick-amounts"><button v-for="value in [100,300,500,700,900,1100,1300,1500]" :key="value" @click="amount=String(value);error=''">{{ fmt(value) }}</button></div>
    <dl><dt>{{ $t('trade.expectedReturn') }}</dt><dd class="positive">+{{ fmt(expected) }} USD</dd><dt>{{ $t('trade.available') }}</dt><dd>{{ session.mode==='common.demo.demo'?'100,000':'0' }} USD <RouterLink class="transfer" :to="path('/assets/transfer')">⇆ {{ $t('trade.transfer') }}</RouterLink></dd></dl>
    <p v-if="error" id="options-error" role="alert" class="form-error">{{ $t(error) }}</p>
    <div class="options-actions"><button class="up" @click="submit('trade.buyUp')">↗ {{ $t('trade.buyUp') }}</button><button class="down" @click="submit('trade.buyDown')">↘ {{ $t('trade.buyDown') }}</button></div>
  </div>
</template>
<style scoped>
.options-form{display:grid;gap:8px;padding-top:8px;font-size:12px;line-height:16px;color:var(--terminal-secondary)}.duration-label{display:flex;align-items:center;gap:4px}.help{min-width:24px;min-height:19px;padding:0}.duration-grid{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:4px}.duration-grid button{display:grid;gap:2px;padding:6px 3px;line-height:16px;min-height:46px;border-radius:4px;background:#0c1017}.duration-grid button.active{background:var(--nt-green);color:#fff}.amount-heading{display:flex;justify-content:space-between;align-items:center;gap:8px;margin-top:4px}.amount-heading label{font-size:12px;color:inherit}.amount-heading>span{font-size:12px}.amount-field{position:relative}.amount-field input{width:100%;padding:7px 48px 7px 12px!important;border-radius:12px;min-height:36px!important}.amount-field>span{position:absolute;right:12px;top:50%;transform:translateY(-50%);pointer-events:none}.quick-amounts{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:4px}.quick-amounts button{background:#0c1017;border-radius:3px;min-height:24px;padding:3px;font-size:12px}.quick-amounts button:hover{background:#ffffff0c}dl{display:grid;grid-template-columns:auto 1fr;align-items:center;gap:16px;margin:2px 0 0}dd{text-align:right;margin:0;font-size:12px}.transfer{display:inline-flex;align-items:center;min-height:24px;margin-left:4px;padding:2px 6px;border-radius:12px;background:#a5ff4a12;color:var(--nt-accent)}.options-actions{display:grid;gap:8px}.options-actions button{border-radius:999px;min-height:36px;padding:9px;color:white}.up{background:var(--nt-green)}.down{background:var(--nt-red)}
@media(pointer:coarse){.duration-grid button,.quick-amounts button,.options-actions button{min-height:44px}}
</style>
