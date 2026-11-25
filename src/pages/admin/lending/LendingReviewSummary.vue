<script setup>
import {computed} from 'vue'
import {Button,Card,Col,Descriptions,DescriptionsItem,Row,Space,Statistic,Table,Tag,TypographyText} from 'ant-design-vue'
const props=defineProps({order:{type:Object,required:true},prices:{type:Object,required:true}})
defineEmits(['user'])
const number=n=>Number(n||0).toLocaleString('zh-CN',{maximumFractionDigits:8})
const date=n=>n?new Date(n).toLocaleString('zh-CN',{hour12:false}):'—'
const daily=computed(()=>props.order.dailyRate??props.order.interestRate/365)
const collateralValue=computed(()=>props.order.collateralAmount*(props.prices[props.order.collateralType]||0))
const levels={none:0,basic:1,advanced:2}
const label=v=>({none:'未认证',basic:'初级认证',advanced:'高级认证'})[v]||'未记录'
const conditions=computed(()=>{
 const e=props.order.eligibilitySnapshot
 return [{key:'verification',name:'认证等级',required:e?(e.minVerificationLevel==='none'?'不限制':label(e.minVerificationLevel)):'未记录',actual:e?label(e.verificationLevel):'未记录',pass:e?levels[e.verificationLevel]>=levels[e.minVerificationLevel]:null},
 {key:'vip',name:'VIP 等级',required:e?(e.minVipLevel?'VIP '+e.minVipLevel:'不限制'):'未记录',actual:e?'VIP '+e.vipLevel:'未记录',pass:e?e.vipLevel>=e.minVipLevel:null}]
})
const columns=[{title:'申请条件',dataIndex:'name',key:'name'},{title:'产品要求',dataIndex:'required',key:'required'},{title:'申请时等级（模拟）',dataIndex:'actual',key:'actual'},{title:'核验结果',key:'result',width:110}]
</script>
<template>
 <Space direction="vertical" :size="16" style="width:100%">
  <Space direction="vertical" :size="4"><Space><TypographyText strong>{{order.productName}}</TypographyText><Tag color="blue">待审核</Tag></Space><TypographyText type="secondary" copyable>{{order.orderId}}</TypographyText></Space>
  <Card size="small"><Row :gutter="24"><Col :span="10"><Statistic title="申请借款" :value="order.loanAmount" :formatter="()=>number(order.loanAmount)" :suffix="order.loanCurrency"/></Col><Col :span="6"><Statistic title="借款期限" :value="order.loanDuration" suffix="天"/></Col><Col :span="8"><Statistic title="日利率" :value="daily" :formatter="()=>number(daily)" suffix="%"/></Col></Row></Card>
  <Descriptions title="申请信息" :column="2" size="small">
   <DescriptionsItem label="申请用户"><Button type="link" @click="$emit('user',order)">{{order.userId}}</Button></DescriptionsItem><DescriptionsItem label="申请时间">{{date(order.createTime)}}</DescriptionsItem>
   <DescriptionsItem label="参考年化利率">{{number(order.interestRate)}}%</DescriptionsItem><DescriptionsItem label="逾期日费率">{{number(order.overduePenaltyRate)}}%</DescriptionsItem>
   <DescriptionsItem label="起息方式" :span="2">审核通过后放款并起息，按 {{order.loanDuration}} 天计算期限</DescriptionsItem>
  </Descriptions>
  <Descriptions title="预留质押" :column="2" size="small">
   <DescriptionsItem label="质押资产">{{order.collateralType?number(order.collateralAmount)+' '+order.collateralType:'无需质押'}}</DescriptionsItem><DescriptionsItem label="质押状态"><Tag :color="order.collateralStatus==='locked'?'blue':'default'">{{order.collateralStatus==='locked'?'已预留':'无需质押'}}</Tag></DescriptionsItem>
   <template v-if="order.collateralType"><DescriptionsItem label="当前估值（模拟）">{{number(collateralValue)}} {{order.loanCurrency}}</DescriptionsItem><DescriptionsItem label="放款后预计质押率">{{collateralValue>0?(order.loanAmount/collateralValue*100).toFixed(2)+'%':'—'}}</DescriptionsItem></template>
  </Descriptions>
  <Card title="申请条件核验" size="small"><Table :columns="columns" :data-source="conditions" row-key="key" :pagination="false" size="small"><template #bodyCell="{column,record}"><Tag v-if="column.key==='result'" :color="record.pass===null?'default':record.pass?'green':'red'">{{record.pass===null?'未记录':record.pass?'符合':'不符合'}}</Tag></template></Table></Card>
 </Space>
</template>
