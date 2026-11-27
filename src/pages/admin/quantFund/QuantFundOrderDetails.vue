<script setup>
// Read-only order detail for review and history: order, terms frozen at subscription, and the latest redemption.
// Daily payouts and operation logs open separately from the list (QuantFundRecordsDrawer).
import {computed} from 'vue'
import {Descriptions, DescriptionsItem, Tag, TypographyText} from 'ant-design-vue'
import {orderStatusLabels, orderStatusColors, redemptionStatusLabels, endReasonLabels, riskLabels, lockLabel} from '../../../shared/quantFund/client.js'
import {heldDays, inLock} from '../../../shared/quantFund/domain.js'
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
   <DescriptionsItem label="累计收益">{{ amount(order.accruedInterest) }} USDT（{{ order.accrualCount }} 天，赎回时随本金返还）</DescriptionsItem>
   <DescriptionsItem label="持有天数">{{ order.interestStartAt ? `${days} 天` : '—' }}</DescriptionsItem>
   <DescriptionsItem label="提交时间">{{ dateTime(order.createdAt) }}</DescriptionsItem>
   <DescriptionsItem label="审核人 / 时间">{{ order.reviewer || '—' }}<template v-if="order.reviewedAt"> · {{ dateTime(order.reviewedAt) }}</template></DescriptionsItem>
   <DescriptionsItem label="起息时间">{{ dateTime(order.interestStartAt) }}</DescriptionsItem>
   <DescriptionsItem label="锁定到期">{{ t.lockDays == null ? '无锁定期' : order.lockUntil ? dateTime(order.lockUntil) + (inLock(order, Date.now()) ? '（锁定中）' : '（已解锁）') : '审核通过后开始计算' }}</DescriptionsItem>
   <DescriptionsItem label="结束时间">{{ dateTime(order.settledAt) }}<template v-if="order.endReason"> · {{ endReasonLabels[order.endReason] }}，实际返还 {{ amount(order.returned) }} USDT</template></DescriptionsItem>
  </Descriptions>
  <Descriptions bordered size="small" :column="2" title="申购时产品条款">
   <DescriptionsItem label="产品">{{ t.name }}（{{ t.code }} · v{{ t.version }}）</DescriptionsItem>
   <DescriptionsItem label="标识币种">{{ t.asset || 'USDT' }}</DescriptionsItem>
   <DescriptionsItem label="风险等级">{{ riskLabels[t.riskLevel] }}</DescriptionsItem>
   <DescriptionsItem label="锁定期">{{ lockLabel(t.lockDays) }}</DescriptionsItem>
   <DescriptionsItem label="提前赎回手续费率">{{ t.lockDays == null ? '—' : t.earlyRedeemFeeRate + '%（按本金）' }}</DescriptionsItem>
   <DescriptionsItem label="日收益率">{{ t.dailyRate }}%</DescriptionsItem>
  </Descriptions>
  <Descriptions v-if="redemption" bordered size="small" :column="2" title="赎回">
   <DescriptionsItem label="赎回单号">{{ redemption.redemptionId }}</DescriptionsItem>
   <DescriptionsItem label="状态">{{ redemptionStatusLabels[redemption.status] }}</DescriptionsItem>
   <DescriptionsItem label="申请时间">{{ dateTime(redemption.requestedAt) }}</DescriptionsItem>
   <DescriptionsItem label="审核人 / 时间">{{ redemption.reviewer || '—' }}<template v-if="redemption.reviewedAt"> · {{ dateTime(redemption.reviewedAt) }}</template></DescriptionsItem>
   <DescriptionsItem label="类型">{{ redemption.early ? '锁定期内提前赎回' : '正常赎回' }}</DescriptionsItem>
   <DescriptionsItem label="手续费">{{ redemption.fee ? `${amount(redemption.fee)} USDT（本金 × ${redemption.feeRate}%）` : '无' }}</DescriptionsItem>
   <DescriptionsItem label="实际返还" :span="2">{{ redemption.returned != null ? `${amount(redemption.returned)} USDT` : `本金 ${amount(redemption.principal)} + 审核通过时的累计收益${redemption.fee ? ` − 手续费 ${amount(redemption.fee)}` : ''}` }}</DescriptionsItem>
  </Descriptions>
 </div>
</template>

<style scoped>.qf-details{display:grid;gap:24px}</style>
