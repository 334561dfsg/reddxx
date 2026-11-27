<script setup>
// Read-only order detail for review and history: order, terms frozen at subscription, and the latest redemption.
// Daily payouts and operation logs open separately from the list (QuantFundRecordsDrawer).
import {computed} from 'vue'
import {Descriptions, DescriptionsItem, Tag, TypographyText} from 'ant-design-vue'
import {orderStatusLabels, orderStatusColors, redemptionStatusLabels, riskLabels, termLabel} from '../../../shared/quantFund/client.js'
import {heldDays} from '../../../shared/quantFund/domain.js'
import {verificationOptions} from '../../../shared/lending/eligibility.js'
import {amount, dateTime} from '../strategy/strategyFormat.js'

const props = defineProps({order: {type: Object, required: true}, redemption: {type: Object, default: null}, balance: {type: Number, default: null}})
const t = computed(() => props.order.productSnapshot)
const levelLabel = value => verificationOptions.find(o => o.value === value)?.label || value || '—'
const days = computed(() => heldDays(props.order, props.order.settledAt || Date.now()))
</script>

<template>
 <div class="qf-details">
  <Descriptions bordered size="small" :column="2" title="订单信息">
   <DescriptionsItem label="订单号"><TypographyText copyable>{{ order.orderId }}</TypographyText></DescriptionsItem>
   <DescriptionsItem label="状态"><Tag :color="orderStatusColors[order.status]">{{ orderStatusLabels[order.status] }}</Tag></DescriptionsItem>
   <DescriptionsItem label="用户">{{ order.userName }}（{{ order.userId }}）</DescriptionsItem>
   <DescriptionsItem label="用户认证 / VIP（申购时）">{{ levelLabel(order.eligibilitySnapshot.verificationLevel) }} / VIP {{ order.eligibilitySnapshot.vipLevel }}</DescriptionsItem>
   <DescriptionsItem label="申购本金">{{ amount(order.principal) }} USDT</DescriptionsItem>
   <DescriptionsItem v-if="balance != null" label="用户当前可用余额">{{ amount(balance) }} USDT</DescriptionsItem>
   <DescriptionsItem label="已派息">{{ amount(order.interestPaidTotal) }} USDT（{{ order.payoutCount }} 次）</DescriptionsItem>
   <DescriptionsItem label="持有天数">{{ order.interestStartAt ? `${days} 天` : '—' }}</DescriptionsItem>
   <DescriptionsItem label="提交时间">{{ dateTime(order.createdAt) }}</DescriptionsItem>
   <DescriptionsItem label="审核人 / 时间">{{ order.reviewer || '—' }}<template v-if="order.reviewedAt"> · {{ dateTime(order.reviewedAt) }}</template></DescriptionsItem>
   <DescriptionsItem label="起息时间">{{ dateTime(order.interestStartAt) }}</DescriptionsItem>
   <DescriptionsItem label="到期时间">{{ t.termDays == null ? '活期，无到期日' : dateTime(order.maturityAt) }}</DescriptionsItem>
   <DescriptionsItem label="结束时间">{{ dateTime(order.settledAt) }}</DescriptionsItem>
  </Descriptions>
  <Descriptions bordered size="small" :column="2" title="申购时产品条款">
   <DescriptionsItem label="产品">{{ t.name }}（{{ t.code }} · v{{ t.version }}）</DescriptionsItem>
   <DescriptionsItem label="标识币种">{{ t.asset || 'USDT' }}</DescriptionsItem>
   <DescriptionsItem label="风险等级">{{ riskLabels[t.riskLevel] }}</DescriptionsItem>
   <DescriptionsItem label="期限">{{ termLabel(t.termDays) }}</DescriptionsItem>
   <DescriptionsItem label="最短持有">{{ t.termDays == null ? `${t.minHoldDays} 天` : '—' }}</DescriptionsItem>
   <DescriptionsItem label="日收益率区间">{{ t.dailyRate.min }}% ~ {{ t.dailyRate.max }}%</DescriptionsItem>
  </Descriptions>
  <Descriptions v-if="redemption" bordered size="small" :column="2" title="赎回">
   <DescriptionsItem label="赎回单号">{{ redemption.redemptionId }}</DescriptionsItem>
   <DescriptionsItem label="状态">{{ redemptionStatusLabels[redemption.status] }}</DescriptionsItem>
   <DescriptionsItem label="申请时间">{{ dateTime(redemption.requestedAt) }}</DescriptionsItem>
   <DescriptionsItem label="审核人 / 时间">{{ redemption.reviewer || '—' }}<template v-if="redemption.reviewedAt"> · {{ dateTime(redemption.reviewedAt) }}</template></DescriptionsItem>
   <DescriptionsItem label="返还本金" :span="2">{{ amount(redemption.principal) }} USDT</DescriptionsItem>
  </Descriptions>
 </div>
</template>

<style scoped>.qf-details{display:grid;gap:24px}</style>
