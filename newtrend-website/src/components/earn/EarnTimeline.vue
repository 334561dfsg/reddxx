<script setup>
import Icon from '../Icon.vue'
defineProps({days:Number,vertical:Boolean})
</script>
<template>
<div class="earn-timeline" :class="{'is-vertical':vertical}">
 <ol><li><span class="timeline-dot"></span><small>{{ $t('earn.timeline.steps.subscribe') }}</small><strong>{{ $t('earn.timeline.values.now') }}</strong></li>
 <li><span class="timeline-dot"></span><small>{{ $t('earn.timeline.steps.accrualStart') }}</small><strong>{{ $t('earn.timeline.values.afterReview') }}</strong><span class="accruing">{{ days?$t('earn.timeline.accruingDays',{days}):$t('earn.timeline.accruingDaily') }}</span></li>
 <li><span class="timeline-dot"></span><small>{{ $t(days?'earn.timeline.steps.maturity':'earn.timeline.steps.redeem') }}</small><strong>{{ days?$t('earn.timeline.values.afterDays',{days}):$t('earn.timeline.values.redeemAnytime') }}</strong></li></ol>
 <p class="timeline-payout"><Icon name="hand-coins"/><span>{{ $t('earn.payoutMode.label') }}</span><b>{{ $t('earn.payoutMode.at_end') }}</b></p>
</div>
</template>
<style scoped>
.earn-timeline ol{list-style:none;margin:28px 0 16px;padding:0;display:grid;grid-template-columns:1fr 1fr auto;gap:0}.earn-timeline li{position:relative;display:flex;flex-direction:column;gap:2px;padding-top:26px;min-width:0}.timeline-dot{position:absolute;top:0;left:0;width:10px;height:10px;border:2px solid #73777b;border-radius:50%;background:var(--nt-card)}.earn-timeline li:not(:last-child):after{content:'';position:absolute;top:4px;left:18px;right:8px;height:1px;background:#383b3e}.earn-timeline li:nth-child(2):after{height:2px;background:var(--nt-accent)}.earn-timeline li:not(:first-child) .timeline-dot{border-color:var(--nt-accent);background:var(--nt-accent)}.earn-timeline small{font-size:12px;color:var(--nt-text-muted)}.earn-timeline strong{font-size:14px;font-weight:500}.accruing{position:absolute;left:50%;top:-8px;z-index:1;transform:translateX(-50%);padding:2px 10px;border:1px solid #a5ff4a20;border-radius:var(--nt-radius-pill);background:#101710;color:var(--nt-accent);font-size:12px;white-space:nowrap}.timeline-payout{display:flex;align-items:center;gap:6px;flex-wrap:wrap;padding-top:12px;border-top:1px solid var(--nt-border-subtle);font-size:12px}.timeline-payout span{color:var(--nt-text-muted)}.timeline-payout b{font-weight:400}.timeline-payout .nt-icon{width:14px;height:14px;opacity:.5}
.is-vertical ol{display:block;margin:30px 0 20px}.is-vertical li{display:grid;grid-template-columns:1fr auto;gap:4px 12px;padding:0 0 12px 22px}.is-vertical li:last-child{padding-bottom:0}.is-vertical .timeline-dot{top:3px}.is-vertical li:not(:last-child):after{top:17px;left:4px;width:1px;height:auto;bottom:3px;right:auto}.is-vertical li:nth-child(2):after{width:2px}.is-vertical strong{text-align:right}.is-vertical .accruing{position:static;transform:none;grid-column:1/-1;border:0;padding:0;background:none;white-space:normal}.is-vertical .timeline-payout{padding-top:12px}
@media(max-width:600px){.earn-timeline:not(.is-vertical) ol{grid-template-columns:1fr;gap:20px}.earn-timeline:not(.is-vertical) li{padding:0 0 0 22px}.earn-timeline:not(.is-vertical) li:after{top:16px;bottom:-16px;height:auto;width:1px;left:4px}.earn-timeline:not(.is-vertical) .accruing{position:static;transform:none;align-self:flex-start;margin-top:6px}}
</style>
