<script setup>
import {Card,Descriptions,DescriptionsItem,TypographyParagraph} from 'ant-design-vue'
import PageShell from '../earn/EarnPageShell.vue'
</script>
<template>
 <PageShell title="借贷规则说明">
  <Card title="产品与申请" :bordered="false"><Descriptions :column="1" bordered>
   <DescriptionsItem label="借款金额">按产品最小、最大借款额校验，不设置账户授信或评分额度。</DescriptionsItem>
   <DescriptionsItem label="期限与利率">每个期限独立设置日利率，年化按日利率 × 365 展示；申请时冻结期限与利率。</DescriptionsItem>
   <DescriptionsItem label="质押">需要质押的产品按初始质押比例预留资产；150% 表示借款 1,000 需质押价值 1,500 的资产。不需要质押的产品不预留资产。</DescriptionsItem>
   <DescriptionsItem label="审核放款">申请待审核时不放款、不计息、不开始期限。批准后到账并起息；拒绝或取消释放预留质押。</DescriptionsItem>
  </Descriptions></Card>
  <Card title="还款与风控" :bordered="false"><Descriptions :column="1" bordered>
   <DescriptionsItem label="计息与还款">利息按完整天累计，逾期按订单费率计算逾期利息。还款依次抵扣逾期利息、普通利息和本金；全部结清释放质押。</DescriptionsItem>
   <DescriptionsItem label="风控设置">预警质押率、处置质押率及人工处置开关集中配置，对新申请生效，已有订单保留原规则。</DescriptionsItem>
   <DescriptionsItem label="当前质押率">待还本息 ÷ 质押资产当前价值 × 100%。达到预警线显示风险状态，达到处置线且允许人工处置时才可执行处置，不自动扣除资产。</DescriptionsItem>
   <DescriptionsItem label="质押处置">质押抵偿欠款，剩余资产返还；不足部分记录结清损失。所有操作保留日志并防止重复处理。</DescriptionsItem>
  </Descriptions></Card>
  <TypographyParagraph type="secondary">当前使用根开发／预览服务的内存 Mock，资产价格为模拟值；服务重启后恢复初始数据，不连接真实资金。</TypographyParagraph>
 </PageShell>
</template>
