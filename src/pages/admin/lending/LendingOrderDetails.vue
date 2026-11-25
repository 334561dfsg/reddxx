<script setup>
import {computed} from 'vue'
import {Button,Card,Col,Descriptions,DescriptionsItem,Row,Space,Statistic,Table,Tag,TypographyText} from 'ant-design-vue'
import LendingReviewSummary from './LendingReviewSummary.vue'
import {statusLabels} from '../../../shared/lending/client.js'
const props=defineProps({order:{type:Object,required:true},prices:{type:Object,required:true},repayments:{type:Array,default:()=>[]},entries:{type:Array,default:()=>[]}})
defineEmits(['user'])
const number=n=>Number(n||0).toLocaleString('en-US',{maximumFractionDigits:8})
const date=n=>n?new Date(n).toLocaleString('zh-CN',{hour12:false}):'—'
const value=computed(()=>props.order.collateralAmount*(props.prices[props.order.collateralType]||0))
const hasRisk=computed(()=>props.order.collateralStatus==='locked'&&['active','repaying','overdue'].includes(props.order.status)&&value.value>0)
const ratio=computed(()=>hasRisk.value?props.order.totalDebt/value.value*100:null)
const risk=computed(()=>ratio.value==null?'不适用':ratio.value>=props.order.collateralDisposalThreshold?'达到处置线':ratio.value>=props.order.collateralWarningThreshold?'风险预警':'正常')
const level=v=>({none:'不限制',basic:'初级认证',advanced:'高级认证'})[v]||'—'
const eligibility=computed(()=>props.order.eligibilitySnapshot)
const repaymentColumns=[{title:'还款时间',key:'time',width:170},{title:'还款金额',key:'amount',align:'right'},{title:'归还本金',key:'principalPaid',align:'right'},{title:'利息',key:'interestPaid',align:'right'},{title:'逾期利息',key:'overduePenaltyPaid',align:'right'}]
const entryColumns=[{title:'时间',key:'time',width:170},{title:'类型',key:'kind'},{title:'变动金额',key:'amount',align:'right'},{title:'币种',dataIndex:'currency',key:'currency',width:80}]
const entryLabels={collateral_reserve:'预留质押',collateral_release:'释放质押',disbursement:'放款',repayment:'还款',collateral_surplus:'返还质押差额',collateral_settlement:'质押结算'}
</script>
<template>
 <LendingReviewSummary v-if="order.status==='pending'" :order="order" :prices="prices" @user="$emit('user',$event)"/>
 <Space v-else direction="vertical" :size="20" style="width:100%">
  <Space wrap><TypographyText strong>{{order.productName}}</TypographyText><Tag :color="order.status==='overdue'?'red':order.status==='pending'?'blue':'default'">{{statusLabels[order.status]}}</Tag><TypographyText type="secondary">{{order.orderId}}</TypographyText></Space>
  <Row :gutter="16"><Col :span="8"><Statistic title="申请金额" :value="order.loanAmount" :formatter="()=>number(order.loanAmount)" :suffix="order.loanCurrency"/></Col><Col :span="8"><Statistic title="待还本息" :value="order.totalDebt" :formatter="()=>number(order.totalDebt)" :suffix="order.loanCurrency"/></Col><Col :span="8"><Statistic title="剩余本金" :value="order.principal" :formatter="()=>number(order.principal)" :suffix="order.loanCurrency"/></Col></Row>
  <Descriptions title="借款信息" :column="2" bordered size="small">
   <DescriptionsItem label="UID"><Button type="link" @click="$emit('user',order)">{{order.userId}}</Button></DescriptionsItem><DescriptionsItem label="借款期限">{{order.loanDuration}} 天</DescriptionsItem>
   <DescriptionsItem label="日利率">{{number(order.dailyRate??order.interestRate/365)}}%</DescriptionsItem><DescriptionsItem label="参考年化利率">{{Number(order.interestRate).toFixed(2)}}%</DescriptionsItem>
   <DescriptionsItem label="累计未还利息">{{number(order.interestAccrued)}} {{order.loanCurrency}}</DescriptionsItem><DescriptionsItem label="累计未还逾期利息">{{number(order.overduePenaltyAccrued)}} {{order.loanCurrency}}</DescriptionsItem>
   <DescriptionsItem label="逾期日费率">{{number(order.overduePenaltyRate)}}%</DescriptionsItem><DescriptionsItem label="申请时间">{{date(order.createTime)}}</DescriptionsItem>
   <DescriptionsItem label="起息时间">{{order.status==='pending'?'审核通过后起息':date(order.interestStartAt)}}</DescriptionsItem><DescriptionsItem label="到期时间">{{date(order.maturityAt)}}</DescriptionsItem>
   <DescriptionsItem label="审核人">{{order.reviewer||'—'}}</DescriptionsItem><DescriptionsItem label="审核时间">{{date(order.reviewedAt)}}</DescriptionsItem>
   <DescriptionsItem v-if="order.shortfall" label="结清损失">{{number(order.shortfall)}} {{order.loanCurrency}}</DescriptionsItem>
  </Descriptions>
  <Descriptions title="质押与风险" :column="2" bordered size="small">
   <DescriptionsItem label="质押状态">{{({locked:'已锁定',released:'已释放',deducted:'已处置',none:'无质押'})[order.collateralStatus]}}</DescriptionsItem><DescriptionsItem label="质押数量">{{order.collateralType?number(order.collateralAmount)+' '+order.collateralType:'—'}}</DescriptionsItem>
   <template v-if="order.collateralType"><DescriptionsItem label="当前质押价值（模拟行情）">{{order.collateralStatus==='locked'?number(value)+' '+order.loanCurrency:'—'}}</DescriptionsItem><DescriptionsItem label="风险状态"><Tag :color="risk==='达到处置线'?'red':risk==='风险预警'?'orange':'default'">{{order.status==='pending'?'待放款':risk}}</Tag></DescriptionsItem>
   <DescriptionsItem label="当前质押率">{{ratio==null?'—':ratio.toFixed(2)+'%'}}</DescriptionsItem><DescriptionsItem label="人工处置">{{order.overdueDeductEnabled?'允许':'不允许'}}</DescriptionsItem><DescriptionsItem label="预警质押率">{{order.collateralWarningThreshold}}%</DescriptionsItem><DescriptionsItem label="处置质押率">{{order.collateralDisposalThreshold}}%</DescriptionsItem></template>
  </Descriptions>
  <Descriptions title="申请条件快照" :column="2" bordered size="small">
   <DescriptionsItem label="最低认证等级">{{eligibility?level(eligibility.minVerificationLevel):'历史订单未记录'}}</DescriptionsItem><DescriptionsItem label="最低 VIP 等级">{{eligibility?(eligibility.minVipLevel?'VIP'+eligibility.minVipLevel:'不限制'):'历史订单未记录'}}</DescriptionsItem>
   <DescriptionsItem v-if="eligibility" label="申请时认证（模拟）">{{eligibility.verificationLevel==='none'?'未认证':level(eligibility.verificationLevel)}}</DescriptionsItem><DescriptionsItem v-if="eligibility" label="申请时 VIP（模拟）">VIP{{eligibility.vipLevel}}</DescriptionsItem>
  </Descriptions>
  <Card :title="'还款记录（'+order.loanCurrency+'）'" size="small"><Table row-key="repaymentId" :columns="repaymentColumns" :data-source="repayments" :pagination="{pageSize:5,hideOnSinglePage:true,showSizeChanger:false}" size="small"><template #bodyCell="{column,record}">{{column.key==='time'?date(record.repaymentTime):number(record[column.key])}}</template></Table></Card>
  <Card title="资金流水" size="small"><Table row-key="id" :columns="entryColumns" :data-source="entries" :pagination="{pageSize:5,hideOnSinglePage:true,showSizeChanger:false}" size="small"><template #bodyCell="{column,record}"><template v-if="column.key==='time'">{{date(record.createdAt)}}</template><template v-else-if="column.key==='kind'">{{entryLabels[record.kind]||record.kind}}</template><TypographyText v-else-if="column.key==='amount'" :type="record.amount<0?'danger':undefined">{{record.amount>0?'+':''}}{{number(record.amount)}}</TypographyText></template></Table></Card>
 </Space>
</template>
