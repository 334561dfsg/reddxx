<script setup>
import {computed, ref} from 'vue'
import {Descriptions, DescriptionsItem, Table, Tag, TypographyText, TypographyTitle} from 'ant-design-vue'
import {statusLabels, statusColors, endReasonLabels, marketLabels, styleLabels, actionLabels} from '../../../shared/strategy/client.js'
import {amount, signed, dateTime, percent} from './strategyFormat.js'
import {verificationOptions} from '../../../shared/lending/eligibility.js'
const levelLabel = value => verificationOptions.find(o => o.value === value)?.label || value || '—'

// Read-only subscription detail: terms frozen at subscription, review, lifecycle, daily P&L, settlement and logs.
const props = defineProps({sub: {type: Object, required: true}, daily: {type: Array, default: () => []}, settlement: {type: Object, default: null}, logs: {type: Array, default: () => []}, balance: {type: Number, default: null}})
const page = ref(1)
const t = computed(() => props.sub.templateSnapshot)
const dailyColumns = [{key: 'date', title: '日期', width: 120}, {key: 'tradeCount', title: '成交笔数', width: 100, align: 'right'}, {key: 'pnl', title: '盈亏（USDT）', width: 140, align: 'right'}]
const logColumns = [{key: 'createdAt', title: '时间', width: 180}, {key: 'action', title: '操作', width: 140}, {key: 'summary', title: '说明'}, {key: 'operator', title: '操作人', width: 150}]
const tone = value => (value > 0 ? 'success' : value < 0 ? 'danger' : undefined)
</script>

<template>
 <div class="strategy-details">
  <Descriptions bordered size="small" :column="2" title="订单信息">
   <DescriptionsItem label="订单号"><TypographyText copyable>{{ sub.subscriptionId }}</TypographyText></DescriptionsItem>
   <DescriptionsItem label="状态"><Tag :color="statusColors[sub.status]">{{ statusLabels[sub.status] }}</Tag><TypographyText v-if="sub.endReason" type="secondary">{{ endReasonLabels[sub.endReason] }}</TypographyText></DescriptionsItem>
   <DescriptionsItem label="用户">{{ sub.userName }}（{{ sub.userId }}）</DescriptionsItem>
   <DescriptionsItem label="用户认证 / VIP（订阅时）">{{ levelLabel(sub.eligibilitySnapshot.verificationLevel) }} / VIP {{ sub.eligibilitySnapshot.vipLevel }}</DescriptionsItem>
   <DescriptionsItem label="本金">{{ amount(sub.capital) }} USDT</DescriptionsItem>
   <DescriptionsItem v-if="balance != null" label="用户当前可用余额">{{ amount(balance) }} USDT</DescriptionsItem>
   <DescriptionsItem label="累计盈亏"><TypographyText :type="tone(sub.pnl)">{{ signed(sub.pnl) }} USDT（{{ percent(sub.pnl, sub.capital) }}）</TypographyText></DescriptionsItem>
   <DescriptionsItem label="累计成交">{{ sub.tradeCount }} 笔</DescriptionsItem>
   <DescriptionsItem label="运行周期">{{ sub.days }} 天</DescriptionsItem>
   <DescriptionsItem label="止盈 / 止损">{{ sub.takeProfit }}% / {{ sub.stopLoss }}%</DescriptionsItem>
   <DescriptionsItem label="提交时间">{{ dateTime(sub.createdAt) }}</DescriptionsItem>
   <DescriptionsItem label="审核人 / 时间">{{ sub.reviewer || '—' }}<template v-if="sub.reviewedAt"> · {{ dateTime(sub.reviewedAt) }}</template></DescriptionsItem>
   <DescriptionsItem label="开始运行">{{ dateTime(sub.runningAt) }}</DescriptionsItem>
   <DescriptionsItem label="到期时间">{{ dateTime(sub.endAt) }}</DescriptionsItem>
   <DescriptionsItem label="结束时间">{{ dateTime(sub.stoppedAt) }}</DescriptionsItem>
  </Descriptions>
  <Descriptions bordered size="small" :column="2" title="订阅时模板条款">
   <DescriptionsItem label="模板">{{ t.name }}（{{ t.templateId }} · v{{ t.version }}）</DescriptionsItem>
   <DescriptionsItem label="市场 / 风格 / 风险">{{ marketLabels[t.market] }} / {{ styleLabels[t.style] }} / Lv.{{ t.risk }}</DescriptionsItem>
   <DescriptionsItem label="交易品种">{{ t.symbols.join('、') }}</DescriptionsItem>
   <DescriptionsItem label="手续费率 / 最大持仓">{{ t.feeRate }}% / {{ t.maxOpenTrades }}</DescriptionsItem>
   <DescriptionsItem label="日收益率区间">{{ t.dailyReturn.min }}% – {{ t.dailyReturn.max }}%</DescriptionsItem>
   <DescriptionsItem label="交易日比例">{{ Math.round(t.tradeDayRatio * 100) }}%</DescriptionsItem>
   <DescriptionsItem label="风控快照">{{ sub.policySnapshot.autoTakeProfitStopLoss ? '自动止盈止损' : '不自动止盈止损' }} · {{ sub.policySnapshot.autoSettleOnExpiry ? '到期自动结算' : '到期人工结算' }}</DescriptionsItem>
  </Descriptions>
  <Descriptions v-if="settlement" bordered size="small" :column="2" title="结算">
   <DescriptionsItem label="结束原因">{{ endReasonLabels[settlement.reason] }}</DescriptionsItem>
   <DescriptionsItem label="处理人">{{ settlement.operator }}</DescriptionsItem>
   <DescriptionsItem label="返还金额">{{ amount(settlement.returned) }} USDT（本金 {{ amount(settlement.capital) }}，盈亏 {{ signed(settlement.pnl) }}）</DescriptionsItem>
   <DescriptionsItem label="结算时间">{{ dateTime(settlement.settledAt) }}</DescriptionsItem>
  </Descriptions>
  <section><TypographyTitle :level="5">每日收益（{{ daily.length }} 条）</TypographyTitle>
   <Table size="small" :columns="dailyColumns" :data-source="daily" row-key="id" :pagination="{current: page, pageSize: 10, total: daily.length, showSizeChanger: false, onChange: v => page = v, hideOnSinglePage: true}" :locale="{emptyText: '暂无收益记录'}">
    <template #bodyCell="{column, record}">
     <TypographyText v-if="column.key === 'pnl'" :type="tone(record.pnl)">{{ signed(record.pnl) }}</TypographyText>
     <template v-else>{{ record[column.key] }}</template>
    </template>
   </Table>
  </section>
  <section><TypographyTitle :level="5">操作记录</TypographyTitle>
   <Table size="small" :columns="logColumns" :data-source="logs" row-key="id" :pagination="false" :locale="{emptyText: '暂无记录'}">
    <template #bodyCell="{column, record}">
     <template v-if="column.key === 'createdAt'">{{ dateTime(record.createdAt) }}</template>
     <template v-else-if="column.key === 'action'">{{ actionLabels[record.action] || record.action }}</template>
     <template v-else>{{ record[column.key] }}</template>
    </template>
   </Table>
  </section>
 </div>
</template>

<style scoped>.strategy-details{display:grid;gap:24px}</style>
